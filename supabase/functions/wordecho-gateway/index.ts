import { withSupabase } from 'npm:@supabase/server';

type DictionarySense = {
  id: string;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
};

type DictionaryLookup = {
  word: string;
  pronunciation: string | null;
  audioUrl: string | null;
  senses: DictionarySense[];
  attribution: {
    providerName: string;
    providerUrl: string;
    sourceUrl: string | null;
    licenseName: string | null;
    licenseUrl: string | null;
  };
};

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_VERSION = 'datamuse-v1';
const LOOKUP_PATH = '/v1/dictionary/lookup';
const PROVIDER_BASE_URL = 'https://api.datamuse.com/words';
const PROVIDER_TIMEOUT_MS = 6_000;
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

class GatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

class DatamuseEntryNotFoundError extends Error {
  constructor() {
    super('Datamuse returned no definitions for the requested word.');
    this.name = 'DatamuseEntryNotFoundError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.normalize('NFKC').trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => text(item, 3_100))
    .filter((item): item is string => item !== null);
}

function comparableWord(value: unknown): string | null {
  return text(value, 120)?.toLocaleLowerCase('en') ?? null;
}

function partOfSpeech(value: string): string | null {
  const code = value.trim().toLowerCase();
  const names: Record<string, string | null> = {
    adj: 'adjective',
    adv: 'adverb',
    n: 'noun',
    u: null,
    v: 'verb',
  };

  return Object.hasOwn(names, code) ? names[code] : code && code.length <= 80 ? code : null;
}

function parseDefinition(
  value: string,
): { definition: string; partOfSpeech: string | null } | null {
  const separatorIndex = value.indexOf('\t');
  const rawPartOfSpeech = separatorIndex >= 0 ? value.slice(0, separatorIndex) : '';
  const definition = text(separatorIndex >= 0 ? value.slice(separatorIndex + 1) : value, 3_000);

  return definition
    ? { definition, partOfSpeech: partOfSpeech(rawPartOfSpeech) }
    : null;
}

function pronunciation(tags: string[]): string | null {
  const tag = tags.find((item) => item.toLowerCase().startsWith('ipa_pron:'));
  const ipa = tag ? text(tag.slice(tag.indexOf(':') + 1), 160) : null;

  return ipa ? `/${ipa.replace(/^\/+|\/+$/g, '')}/` : null;
}

function parseProviderResponse(value: unknown, fallbackWord: string): DictionaryLookup {
  if (!Array.isArray(value)) {
    throw new Error('Datamuse returned an invalid response.');
  }

  const requestedWord = comparableWord(fallbackWord);
  const entries = value.filter(isRecord);
  const entry =
    entries.find((item) => strings(item.tags).some((tag) => tag.toLowerCase() === 'query')) ??
    entries.find((item) => comparableWord(item.word) === requestedWord);

  if (!entry) {
    throw new DatamuseEntryNotFoundError();
  }

  const senses: DictionarySense[] = [];
  const seenSenses = new Set<string>();

  strings(entry.defs).forEach((definitionValue, definitionIndex) => {
    if (senses.length >= 20) return;

    const parsed = parseDefinition(definitionValue);
    if (!parsed) return;

    const dedupeKey = `${parsed.partOfSpeech ?? ''}|${parsed.definition.toLowerCase()}`;
    if (seenSenses.has(dedupeKey)) return;
    seenSenses.add(dedupeKey);

    senses.push({
      id: `datamuse-${definitionIndex}`,
      definition: parsed.definition,
      partOfSpeech: parsed.partOfSpeech,
      example: null,
      synonyms: [],
      antonyms: [],
    });
  });

  if (senses.length === 0) {
    throw new DatamuseEntryNotFoundError();
  }

  const tags = strings(entry.tags);

  return {
    word: text(entry.word, 120) ?? fallbackWord,
    pronunciation: pronunciation(tags),
    audioUrl: null,
    senses,
    attribution: {
      providerName: 'Datamuse',
      providerUrl: 'https://www.datamuse.com/api/',
      sourceUrl: null,
      licenseName: null,
      licenseUrl: null,
    },
  };
}

function isCachedLookup(value: unknown): value is DictionaryLookup {
  if (!isRecord(value) || typeof value.word !== 'string' || !Array.isArray(value.senses)) {
    return false;
  }

  if (!isRecord(value.attribution) || typeof value.attribution.providerName !== 'string') {
    return false;
  }

  return value.senses.length > 0 && value.senses.every((sense) => {
    return (
      isRecord(sense) &&
      typeof sense.id === 'string' &&
      typeof sense.definition === 'string' &&
      Array.isArray(sense.synonyms) &&
      Array.isArray(sense.antonyms)
    );
  });
}

function requestId(): string {
  return crypto.randomUUID();
}

function jsonResponse(
  body: unknown,
  status: number,
  gatewayRequestId: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      ...extraHeaders,
      'Cache-Control': 'no-store',
      'X-Request-Id': gatewayRequestId,
    },
  });
}

function normalizeQuery(url: URL): { cacheKey: string; locale: string; word: string } {
  const word = url.searchParams.get('word')?.normalize('NFKC').trim() ?? '';
  const locale = url.searchParams.get('locale')?.trim().toLowerCase() || 'en';

  if (!word || word.length > 120) {
    throw new GatewayError(
      400,
      'invalid_request',
      'Enter a word no longer than 120 characters.',
    );
  }

  if (locale !== 'en') {
    throw new GatewayError(
      400,
      'unsupported_locale',
      'Dictionary lookup currently supports English words only.',
    );
  }

  return {
    cacheKey: `${CACHE_VERSION}:${locale}:${word.toLocaleLowerCase('en')}`,
    locale,
    word,
  };
}

function clientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address =
    forwardedFor ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown';
  const userAgent = request.headers.get('user-agent')?.slice(0, 200) || 'unknown';

  return `${address}\u0000${userAgent}`;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

async function readProviderJson(response: Response): Promise<unknown> {
  const body = await response.text();

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export default {
  fetch: withSupabase({ auth: 'none' }, async (request, context) => {
    const gatewayRequestId = requestId();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (!url.pathname.endsWith(LOOKUP_PATH)) {
      return jsonResponse(
        { code: 'not_found', message: 'Gateway route not found.', requestId: gatewayRequestId },
        404,
        gatewayRequestId,
      );
    }

    if (request.method !== 'GET') {
      return jsonResponse(
        { code: 'method_not_allowed', message: 'Use GET for this endpoint.', requestId: gatewayRequestId },
        405,
        gatewayRequestId,
        { Allow: 'GET, OPTIONS' },
      );
    }

    try {
      const rateLimitSalt = Deno.env.get('DICTIONARY_RATE_LIMIT_SALT');
      if (!rateLimitSalt || rateLimitSalt.length < 32) {
        console.error('DICTIONARY_RATE_LIMIT_SALT is missing or too short.', {
          gatewayRequestId,
        });
        throw new GatewayError(
          503,
          'gateway_not_configured',
          'Dictionary lookup is not configured yet.',
        );
      }

      const identifierHash = await sha256(`${rateLimitSalt}\u0000${clientIdentifier(request)}`);
      const { data: quotaRows, error: quotaError } = await context.supabaseAdmin.rpc(
        'consume_dictionary_lookup_quota',
        {
          p_identifier_hash: identifierHash,
          p_limit: RATE_LIMIT,
          p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
        },
      );

      if (quotaError) {
        console.error('Dictionary rate-limit check failed.', {
          code: quotaError.code,
          gatewayRequestId,
        });
        throw new GatewayError(
          503,
          'gateway_unavailable',
          'Dictionary lookup is temporarily unavailable.',
        );
      }

      const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
      if (!isRecord(quota) || typeof quota.allowed !== 'boolean') {
        console.error('Dictionary rate-limit check returned an invalid result.', {
          gatewayRequestId,
        });
        throw new GatewayError(
          503,
          'gateway_unavailable',
          'Dictionary lookup is temporarily unavailable.',
        );
      }

      if (!quota.allowed) {
        const retryAfterSeconds =
          typeof quota.retry_after_seconds === 'number'
            ? Math.max(1, Math.ceil(quota.retry_after_seconds))
            : RATE_LIMIT_WINDOW_SECONDS;

        return jsonResponse(
          {
            code: 'rate_limited',
            message: 'Too many dictionary lookups. Please try again shortly.',
            requestId: gatewayRequestId,
          },
          429,
          gatewayRequestId,
          { 'Retry-After': String(retryAfterSeconds) },
        );
      }

      const query = normalizeQuery(url);
      const now = new Date();
      const { data: cachedRow, error: cacheReadError } = await context.supabaseAdmin
        .from('dictionary_lookup_cache')
        .select('payload')
        .eq('cache_key', query.cacheKey)
        .gt('expires_at', now.toISOString())
        .maybeSingle();

      if (cacheReadError) {
        console.warn('Dictionary cache read failed; continuing with the provider.', {
          code: cacheReadError.code,
          gatewayRequestId,
        });
      } else if (cachedRow && isCachedLookup(cachedRow.payload)) {
        return jsonResponse(
          { data: cachedRow.payload, meta: { requestId: gatewayRequestId, cached: true } },
          200,
          gatewayRequestId,
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
      let providerResponse: Response;
      const providerUrl = new URL(PROVIDER_BASE_URL);
      providerUrl.searchParams.set('sp', query.word);
      providerUrl.searchParams.set('qe', 'sp');
      providerUrl.searchParams.set('md', 'dpr');
      providerUrl.searchParams.set('ipa', '1');
      providerUrl.searchParams.set('max', '10');

      try {
        providerResponse = await fetch(providerUrl, {
          headers: { Accept: 'application/json' },
          method: 'GET',
          signal: controller.signal,
        });
      } catch (error) {
        console.warn('Dictionary provider could not be reached.', {
          gatewayRequestId,
          reason: error instanceof Error ? error.name : 'unknown',
        });
        throw new GatewayError(
          503,
          'provider_unavailable',
          'Dictionary lookup is temporarily unavailable.',
        );
      } finally {
        clearTimeout(timeout);
      }

      if (providerResponse.status === 404) {
        throw new GatewayError(404, 'not_found', 'No dictionary entry was found for this word.');
      }

      if (!providerResponse.ok) {
        console.warn('Dictionary provider returned an error response.', {
          gatewayRequestId,
          status: providerResponse.status,
        });
        throw new GatewayError(
          503,
          'provider_unavailable',
          'Dictionary lookup is temporarily unavailable.',
        );
      }

      const providerBody = await readProviderJson(providerResponse);
      let lookup: DictionaryLookup;

      try {
        lookup = parseProviderResponse(providerBody, query.word);
      } catch (error) {
        if (error instanceof DatamuseEntryNotFoundError) {
          throw new GatewayError(
            404,
            'not_found',
            'No dictionary entry was found for this word.',
          );
        }

        console.warn('Dictionary provider returned an invalid response.', { gatewayRequestId });
        throw new GatewayError(
          503,
          'provider_unavailable',
          'Dictionary lookup is temporarily unavailable.',
        );
      }

      const expiresAt = new Date(now.getTime() + CACHE_TTL_SECONDS * 1_000).toISOString();
      const { error: cacheWriteError } = await context.supabaseAdmin
        .from('dictionary_lookup_cache')
        .upsert(
          {
            cache_key: query.cacheKey,
            payload: lookup,
            expires_at: expiresAt,
            updated_at: now.toISOString(),
          },
          { onConflict: 'cache_key' },
        );

      if (cacheWriteError) {
        console.warn('Dictionary cache write failed; returning the provider result.', {
          code: cacheWriteError.code,
          gatewayRequestId,
        });
      }

      return jsonResponse(
        { data: lookup, meta: { requestId: gatewayRequestId, cached: false } },
        200,
        gatewayRequestId,
      );
    } catch (error) {
      if (error instanceof GatewayError) {
        return jsonResponse(
          { code: error.code, message: error.message, requestId: gatewayRequestId },
          error.status,
          gatewayRequestId,
        );
      }

      console.error('Dictionary gateway request failed.', {
        gatewayRequestId,
        reason: error instanceof Error ? error.name : 'unknown',
      });
      return jsonResponse(
        {
          code: 'gateway_error',
          message: 'Dictionary lookup is temporarily unavailable.',
          requestId: gatewayRequestId,
        },
        500,
        gatewayRequestId,
      );
    }
  }),
};
