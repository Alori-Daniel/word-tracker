import type { DictionaryGatewayErrorCode } from '@/domain/dictionary';

export class DictionaryGatewayError extends Error {
  constructor(
    readonly code: DictionaryGatewayErrorCode,
    message: string,
    readonly status: number | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'DictionaryGatewayError';
  }
}
