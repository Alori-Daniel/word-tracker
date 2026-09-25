import type { DictionaryLookup } from '../../src/domain/dictionary';
import { parseDictionaryLookup } from '../../src/services/dictionary';
import { parseFreeDictionaryResponse } from './free-dictionary-parser';

export type DictionaryLookupRateLimit =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds?: number };

export type DictionaryLookupCache = {
  get: (key: string) => Promise<unknown | null>;
  set: (key: string, value: unknown, ttlSeconds: number) => Promise<void>;
};

export type DictionaryLookupDependencies = {
  allowedOrigin?: string;
  cache: DictionaryLookupCache;
  checkRateLimit: (request: Request) => Promise<DictionaryLookupRateLimit>;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, 'error' | 'warn'>;
};

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const PROVIDER_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries';

class DictionaryRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function createRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `dictionary-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function corsHeaders(allowedOrigin?: string): Record<string, string> {
  return allowedOrigin
    ? {
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Origin': allowedOrigin,
        Vary: 'Origin',
      }
    : {};
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  allowedOrigin?: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(allowedOrigin),
      ...extraHeaders,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    },
  });
}

function normalizeQuery(url: URL): { cacheKey: string; locale: string; word: string } {
  const word = url.searchParams.get('word')?.normalize('NFKC').trim() ?? '';
  const locale = url.searchParams.get('locale')?.trim().toLowerCase() || 'en';

  if (!word || word.length > 120) {
    throw new DictionaryRequestError(
      400,
      'invalid_request',
      'Enter a word no longer than 120 characters.',
    );
  }

  if (locale !== 'en') {
    throw new DictionaryRequestError(
      400,
      'unsupported_locale',
      'Dictionary lookup currently supports English words only.',
    );
  }

  return {
    cacheKey: `${locale}:${word.toLocaleLowerCase('en')}`,
    locale,
    word,
  };
}

async function readProviderJson(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function createDictionaryLookupHandler({
  allowedOrigin,
  cache,
  checkRateLimit,
  fetchImpl = fetch,
  logger = console,
}: DictionaryLookupDependencies) {
  return async function handleDictionaryLookup(request: Request): Promise<Response> {
    const requestId = createRequestId();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    if (request.method !== 'GET') {
      return jsonResponse(
        { code: 'method_not_allowed', message: 'Use GET for this endpoint.', requestId },
        405,
        requestId,
        allowedOrigin,
        { Allow: 'GET, OPTIONS' },
      );
    }

    try {
      const limit = await checkRateLimit(request);

      if (!limit.allowed) {
        return jsonResponse(
          {
            code: 'rate_limited',
            message: 'Too many dictionary lookups. Please try again shortly.',
            requestId,
          },
          429,
          requestId,
          allowedOrigin,
          limit.retryAfterSeconds === undefined
            ? {}
            : { 'Retry-After': String(limit.retryAfterSeconds) },
        );
      }

      const query = normalizeQuery(new URL(request.url));
      let cachedValue: unknown | null = null;

      try {
        cachedValue = await cache.get(query.cacheKey);
      } catch (error) {
        logger.warn('Dictionary cache read failed; continuing with the provider.', {
          error,
          gatewayRequestId: requestId,
        });
      }

      if (cachedValue) {
        try {
          const lookup = parseDictionaryLookup(cachedValue);
          return jsonResponse(
            { data: lookup, meta: { requestId, cached: true } },
            200,
            requestId,
            allowedOrigin,
          );
        } catch (error) {
          logger.warn('Dictionary cache entry was invalid; refreshing it.', {
            error,
            gatewayRequestId: requestId,
          });
        }
      }

      const providerResponse = await fetchImpl(
        `${PROVIDER_BASE_URL}/${query.locale}/${encodeURIComponent(query.word)}`,
        { headers: { Accept: 'application/json' }, method: 'GET' },
      );

      if (providerResponse.status === 404) {
        throw new DictionaryRequestError(
          404,
          'not_found',
          'No dictionary entry was found for this word.',
        );
      }

      if (!providerResponse.ok) {
        logger.warn('Dictionary provider request failed.', {
          gatewayRequestId: requestId,
          status: providerResponse.status,
        });
        throw new DictionaryRequestError(
          503,
          'provider_unavailable',
          'Dictionary lookup is temporarily unavailable.',
        );
      }

      const providerBody = await readProviderJson(providerResponse);
      let lookup: DictionaryLookup;

      try {
        lookup = parseFreeDictionaryResponse(providerBody, query.word);
      } catch (error) {
        logger.warn('Dictionary provider returned an invalid response.', {
          error,
          gatewayRequestId: requestId,
        });
        throw new DictionaryRequestError(
          503,
          'provider_unavailable',
          'Dictionary lookup is temporarily unavailable.',
        );
      }

      try {
        await cache.set(query.cacheKey, lookup, CACHE_TTL_SECONDS);
      } catch (error) {
        logger.warn('Dictionary cache write failed; returning the provider result.', {
          error,
          gatewayRequestId: requestId,
        });
      }

      return jsonResponse(
        { data: lookup, meta: { requestId, cached: false } },
        200,
        requestId,
        allowedOrigin,
      );
    } catch (error) {
      if (error instanceof DictionaryRequestError) {
        return jsonResponse(
          { code: error.code, message: error.message, requestId },
          error.status,
          requestId,
          allowedOrigin,
        );
      }

      logger.error('Dictionary gateway request failed.', {
        error,
        gatewayRequestId: requestId,
      });
      return jsonResponse(
        {
          code: 'gateway_error',
          message: 'Dictionary lookup is temporarily unavailable.',
          requestId,
        },
        500,
        requestId,
        allowedOrigin,
      );
    }
  };
}
