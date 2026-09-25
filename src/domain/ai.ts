export const AI_GATEWAY_API_VERSION = 1 as const;

export type AiWordAssistRequest = {
  word: string;
  context?: string | null;
  existingDefinition?: string | null;
  locale?: string;
};

export type AiWordSuggestion = {
  word: string;
  pronunciation: string | null;
  definition: string;
  simpleDefinition: string;
  partOfSpeech: string | null;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  memoryTip: string | null;
  contextExplanation: string | null;
};

export type AiWordAssistMetadata = {
  requestId: string | null;
  provider: string;
  model: string | null;
  remaining: number | null;
};

export type AiWordAssistResult = {
  suggestion: AiWordSuggestion;
  metadata: AiWordAssistMetadata;
};

export type AiGatewayErrorCode =
  | 'not_configured'
  | 'invalid_request'
  | 'unauthenticated'
  | 'upgrade_required'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'unavailable'
  | 'invalid_response';
