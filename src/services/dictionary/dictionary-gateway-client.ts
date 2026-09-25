import type {
  DictionaryGatewayErrorCode,
  DictionaryLookupResult,
} from '@/domain/dictionary';
import { normalizeGatewayBaseUrl } from '@/services/gateway';

import { DictionaryGatewayError } from './dictionary-gateway-error';
import { parseDictionaryGatewayResponse } from './dictionary-response-parser';

type DictionaryGatewayClientOptions = {
  baseUrl?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 12_000;

function normalizeWord(value: string): string {
  const word = value.normalize('NFKC').trim();

  if (!word || word.length > 120) {
    throw new DictionaryGatewayError(
      'invalid_request',
      'Enter a word no longer than 120 characters before looking it up.',
    );
  }

  return word;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function statusCode(status: number): DictionaryGatewayErrorCode {
  if (status === 400) return 'invalid_request';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  return 'unavailable';
}

function defaultMessage(code: DictionaryGatewayErrorCode): string {
  if (code === 'not_found') return 'No dictionary entry was found for this word.';
  if (code === 'rate_limited') return 'Too many lookups. Please try again shortly.';
  if (code === 'invalid_request') return 'Enter a valid word to look up.';
  return 'Dictionary lookup is temporarily unavailable.';
}

export class DictionaryGatewayClient {
  readonly isConfigured: boolean;

  private readonly baseUrl: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor({
    baseUrl,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: DictionaryGatewayClientOptions) {
    this.baseUrl = normalizeGatewayBaseUrl(baseUrl);
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.isConfigured = this.baseUrl !== null;
  }

  async lookupWord(wordInput: string, locale = 'en'): Promise<DictionaryLookupResult> {
    if (!this.baseUrl) {
      throw new DictionaryGatewayError(
        'not_configured',
        'Dictionary lookup is not connected yet.',
      );
    }

    const word = normalizeWord(wordInput);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = `${this.baseUrl}/v1/dictionary/lookup?word=${encodeURIComponent(word)}&locale=${encodeURIComponent(locale)}`;

    try {
      const response = await this.fetchImpl(url, {
        headers: { Accept: 'application/json' },
        method: 'GET',
        signal: controller.signal,
      });
      const body = await readJson(response);

      if (!response.ok) {
        const code = statusCode(response.status);
        const message =
          isRecord(body) && typeof body.message === 'string' && body.message.trim()
            ? body.message.trim()
            : defaultMessage(code);
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);

        throw new DictionaryGatewayError(
          code,
          message,
          response.status,
          Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : null,
        );
      }

      try {
        return parseDictionaryGatewayResponse(body);
      } catch {
        throw new DictionaryGatewayError(
          'invalid_response',
          'The dictionary returned an unexpected response. Please try again.',
          response.status,
        );
      }
    } catch (error) {
      if (error instanceof DictionaryGatewayError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DictionaryGatewayError(
          'timeout',
          'The dictionary lookup took too long. Please try again.',
        );
      }

      throw new DictionaryGatewayError(
        'network',
        'The dictionary could not be reached. Check your connection and try again.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
