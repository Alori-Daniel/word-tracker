import type { AiGatewayErrorCode } from '@/domain/ai';

export class AiGatewayError extends Error {
  readonly code: AiGatewayErrorCode;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;
  readonly status: number | null;

  constructor(
    code: AiGatewayErrorCode,
    message: string,
    options: {
      requestId?: string | null;
      retryAfterSeconds?: number | null;
      status?: number | null;
    } = {},
  ) {
    super(message);
    this.name = 'AiGatewayError';
    this.code = code;
    this.requestId = options.requestId ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.status = options.status ?? null;
  }
}
