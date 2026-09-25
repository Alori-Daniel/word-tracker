import {
  AI_GATEWAY_API_VERSION,
  type AiGatewayErrorCode,
  type AiWordAssistRequest,
  type AiWordAssistResult,
} from '@/domain/ai';

import { AiGatewayError } from './ai-gateway-error';
import { parseAiGatewayResponse } from './ai-response-parser';

type Fetch = typeof fetch;

export type AiGatewayClientOptions = {
  baseUrl?: string | null;
  fetchImpl?: Fetch;
  getAccessToken?: () => Promise<string | null>;
  timeoutMs?: number;
};

type GatewayErrorBody = {
  code?: unknown;
  message?: unknown;
  requestId?: unknown;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const REQUEST_PATH = 'v1/word-assist';

function normalizeBaseUrl(baseUrl?: string | null): string | null {
  const candidate = baseUrl?.trim();

  if (!candidate) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const isSecure = parsed.protocol === 'https:';
  const isLoopback =
    parsed.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(parsed.hostname);

  if (!isSecure && !isLoopback) {
    return null;
  }

  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
}

function normalizeRequest(input: AiWordAssistRequest) {
  const word = input.word.normalize('NFKC').trim();

  if (!word || word.length > 120) {
    throw new AiGatewayError(
      'invalid_request',
      'Enter a word no longer than 120 characters before using AI assistance.',
    );
  }

  const context = input.context?.normalize('NFKC').trim() || null;
  const existingDefinition = input.existingDefinition?.normalize('NFKC').trim() || null;
  const locale = input.locale?.trim() || 'en';

  if (context && context.length > 2_000) {
    throw new AiGatewayError('invalid_request', 'The source context is too long for AI assistance.');
  }

  if (existingDefinition && existingDefinition.length > 3_000) {
    throw new AiGatewayError(
      'invalid_request',
      'The existing definition is too long for AI assistance.',
    );
  }

  return {
    version: AI_GATEWAY_API_VERSION,
    word,
    context,
    existingDefinition,
    locale,
  };
}

function mapStatusToCode(status: number, body: GatewayErrorBody): AiGatewayErrorCode {
  if (status === 400) return 'invalid_request';
  if (status === 401) return 'unauthenticated';
  if (status === 402 || status === 403 || body.code === 'upgrade_required') {
    return 'upgrade_required';
  }
  if (status === 429) return 'rate_limited';
  return 'unavailable';
}

function defaultMessage(code: AiGatewayErrorCode): string {
  switch (code) {
    case 'invalid_request':
      return 'The AI request could not be processed.';
    case 'unauthenticated':
      return 'Sign in to use AI assistance.';
    case 'upgrade_required':
      return 'AI assistance requires an eligible premium plan.';
    case 'rate_limited':
      return 'You have reached the AI request limit. Please try again later.';
    default:
      return 'AI assistance is temporarily unavailable.';
  }
}

function readRetryAfter(response: Response): number | null {
  const value = response.headers.get('retry-after');
  const seconds = value ? Number(value) : Number.NaN;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isGatewayErrorBody(value: unknown): value is GatewayErrorBody {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class AiGatewayClient {
  readonly isConfigured: boolean;

  private readonly baseUrl: string | null;
  private readonly fetchImpl: Fetch;
  private readonly getAccessToken?: () => Promise<string | null>;
  private readonly timeoutMs: number;

  constructor({
    baseUrl,
    fetchImpl = fetch,
    getAccessToken,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: AiGatewayClientOptions) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetchImpl = fetchImpl;
    this.getAccessToken = getAccessToken;
    this.timeoutMs = timeoutMs;
    this.isConfigured = this.baseUrl !== null;
  }

  async generateWordSuggestion(input: AiWordAssistRequest): Promise<AiWordAssistResult> {
    if (!this.baseUrl) {
      throw new AiGatewayError(
        'not_configured',
        'AI assistance is not connected to a secure gateway yet.',
      );
    }

    const requestBody = normalizeRequest(input);
    const accessToken = await this.getAccessToken?.();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/${REQUEST_PATH}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      const body = await readJson(response);

      if (!response.ok) {
        const errorBody = isGatewayErrorBody(body) ? body : {};
        const code = mapStatusToCode(response.status, errorBody);
        const message =
          typeof errorBody.message === 'string' && errorBody.message.trim()
            ? errorBody.message.trim()
            : defaultMessage(code);

        throw new AiGatewayError(code, message, {
          requestId:
            typeof errorBody.requestId === 'string' ? errorBody.requestId : null,
          retryAfterSeconds: readRetryAfter(response),
          status: response.status,
        });
      }

      try {
        return parseAiGatewayResponse(body);
      } catch {
        throw new AiGatewayError(
          'invalid_response',
          'The AI service returned an unexpected response. Please try again.',
          { status: response.status },
        );
      }
    } catch (error) {
      if (error instanceof AiGatewayError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AiGatewayError('timeout', 'The AI request took too long. Please try again.');
      }

      throw new AiGatewayError(
        'network',
        'The AI service could not be reached. Check your connection and try again.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
