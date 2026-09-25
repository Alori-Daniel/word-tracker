import type {
  AiWordAssistMetadata,
  AiWordAssistResult,
  AiWordSuggestion,
} from '@/domain/ai';

const LIMITS = {
  word: 120,
  pronunciation: 160,
  definition: 3_000,
  simpleDefinition: 1_000,
  partOfSpeech: 80,
  example: 700,
  examples: 4,
  relatedWord: 120,
  relatedWords: 12,
  memoryTip: 1_000,
  contextExplanation: 2_000,
  metadataValue: 200,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  value: unknown,
  field: string,
  maxLength: number,
  options: { allowEmpty?: boolean; nullable?: boolean } = {},
): string | null {
  if (value === null && options.nullable) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string${options.nullable ? ' or null' : ''}.`);
  }

  const normalized = value.normalize('NFKC').trim();

  if (!normalized) {
    if (options.nullable) {
      return null;
    }

    if (options.allowEmpty) {
      return '';
    }

    throw new Error(`${field} cannot be empty.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${field} is longer than allowed.`);
  }

  return normalized;
}

function readStringArray(
  value: unknown,
  field: string,
  maxItems: number,
  maxItemLength: number,
): string[] {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${field} must be an array with no more than ${maxItems} items.`);
  }

  const normalized = value.map((item, index) => {
    const parsed = readString(item, `${field}[${index}]`, maxItemLength);

    if (parsed === null) {
      throw new Error(`${field}[${index}] cannot be null.`);
    }

    return parsed;
  });

  return [...new Set(normalized)];
}

export function parseAiWordSuggestion(value: unknown): AiWordSuggestion {
  if (!isRecord(value)) {
    throw new Error('AI suggestion must be an object.');
  }

  const word = readString(value.word, 'word', LIMITS.word);
  const definition = readString(value.definition, 'definition', LIMITS.definition);
  const simpleDefinition = readString(
    value.simpleDefinition,
    'simpleDefinition',
    LIMITS.simpleDefinition,
  );

  if (word === null || definition === null || simpleDefinition === null) {
    throw new Error('AI suggestion is missing required text.');
  }

  return {
    word,
    pronunciation: readString(value.pronunciation, 'pronunciation', LIMITS.pronunciation, {
      allowEmpty: true,
      nullable: true,
    }),
    definition,
    simpleDefinition,
    partOfSpeech: readString(value.partOfSpeech, 'partOfSpeech', LIMITS.partOfSpeech, {
      allowEmpty: true,
      nullable: true,
    }),
    examples: readStringArray(value.examples, 'examples', LIMITS.examples, LIMITS.example),
    synonyms: readStringArray(
      value.synonyms,
      'synonyms',
      LIMITS.relatedWords,
      LIMITS.relatedWord,
    ),
    antonyms: readStringArray(
      value.antonyms,
      'antonyms',
      LIMITS.relatedWords,
      LIMITS.relatedWord,
    ),
    memoryTip: readString(value.memoryTip, 'memoryTip', LIMITS.memoryTip, {
      allowEmpty: true,
      nullable: true,
    }),
    contextExplanation: readString(
      value.contextExplanation,
      'contextExplanation',
      LIMITS.contextExplanation,
      { allowEmpty: true, nullable: true },
    ),
  };
}

function readOptionalMetadataString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return readString(value, field, LIMITS.metadataValue, { nullable: true });
}

function parseMetadata(value: unknown): AiWordAssistMetadata {
  if (!isRecord(value)) {
    throw new Error('AI response metadata must be an object.');
  }

  const provider = readString(value.provider, 'meta.provider', LIMITS.metadataValue);

  if (provider === null) {
    throw new Error('AI response metadata is missing a provider.');
  }

  if (
    value.remaining !== null &&
    value.remaining !== undefined &&
    (!Number.isInteger(value.remaining) || (value.remaining as number) < 0)
  ) {
    throw new Error('meta.remaining must be a non-negative integer or null.');
  }

  return {
    requestId: readOptionalMetadataString(value.requestId, 'meta.requestId'),
    provider,
    model: readOptionalMetadataString(value.model, 'meta.model'),
    remaining:
      value.remaining === null || value.remaining === undefined
        ? null
        : (value.remaining as number),
  };
}

export function parseAiGatewayResponse(value: unknown): AiWordAssistResult {
  if (!isRecord(value)) {
    throw new Error('AI gateway response must be an object.');
  }

  return {
    suggestion: parseAiWordSuggestion(value.data),
    metadata: parseMetadata(value.meta),
  };
}
