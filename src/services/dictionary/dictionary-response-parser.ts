import type {
  DictionaryAttribution,
  DictionaryLookup,
  DictionaryLookupResult,
  DictionarySense,
} from '@/domain/dictionary';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  value: unknown,
  field: string,
  maxLength: number,
  nullable = false,
): string | null {
  if (value === null && nullable) return null;

  if (typeof value !== 'string') {
    throw new Error(`${field} must be text${nullable ? ' or null' : ''}.`);
  }

  const normalized = value.normalize('NFKC').trim();

  if (!normalized) {
    if (nullable) return null;
    throw new Error(`${field} cannot be empty.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${field} is longer than allowed.`);
  }

  return normalized;
}

function readUrl(value: unknown, field: string, nullable = false): string | null {
  const url = readString(value, field, 2_000, nullable);
  if (url === null) return null;

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${field} must be a valid URL.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${field} must use HTTPS.`);
  }

  return parsed.toString();
}

function readStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 12) {
    throw new Error(`${field} must contain no more than 12 values.`);
  }

  const values = value.map((item, index) => {
    const parsed = readString(item, `${field}[${index}]`, 120);
    if (parsed === null) throw new Error(`${field}[${index}] cannot be null.`);
    return parsed;
  });

  return [...new Set(values)];
}

function parseSense(value: unknown, index: number): DictionarySense {
  if (!isRecord(value)) {
    throw new Error(`senses[${index}] must be an object.`);
  }

  const id = readString(value.id, `senses[${index}].id`, 120);
  const definition = readString(value.definition, `senses[${index}].definition`, 3_000);

  if (id === null || definition === null) {
    throw new Error(`senses[${index}] is incomplete.`);
  }

  return {
    id,
    definition,
    partOfSpeech: readString(
      value.partOfSpeech,
      `senses[${index}].partOfSpeech`,
      80,
      true,
    ),
    example: readString(value.example, `senses[${index}].example`, 700, true),
    synonyms: readStringList(value.synonyms, `senses[${index}].synonyms`),
    antonyms: readStringList(value.antonyms, `senses[${index}].antonyms`),
  };
}

function parseAttribution(value: unknown): DictionaryAttribution {
  if (!isRecord(value)) {
    throw new Error('Dictionary attribution must be an object.');
  }

  const providerName = readString(value.providerName, 'attribution.providerName', 120);
  const providerUrl = readUrl(value.providerUrl, 'attribution.providerUrl');

  if (providerName === null || providerUrl === null) {
    throw new Error('Dictionary attribution is incomplete.');
  }

  return {
    providerName,
    providerUrl,
    sourceUrl: readUrl(value.sourceUrl, 'attribution.sourceUrl', true),
    licenseName: readString(value.licenseName, 'attribution.licenseName', 200, true),
    licenseUrl: readUrl(value.licenseUrl, 'attribution.licenseUrl', true),
  };
}

export function parseDictionaryLookup(value: unknown): DictionaryLookup {
  if (!isRecord(value)) {
    throw new Error('Dictionary lookup must be an object.');
  }

  if (!Array.isArray(value.senses) || value.senses.length === 0 || value.senses.length > 20) {
    throw new Error('Dictionary lookup must contain between 1 and 20 meanings.');
  }

  const word = readString(value.word, 'word', 120);
  if (word === null) throw new Error('Dictionary lookup is missing its word.');

  return {
    word,
    pronunciation: readString(value.pronunciation, 'pronunciation', 160, true),
    audioUrl: readUrl(value.audioUrl, 'audioUrl', true),
    senses: value.senses.map(parseSense),
    attribution: parseAttribution(value.attribution),
  };
}

export function parseDictionaryGatewayResponse(value: unknown): DictionaryLookupResult {
  if (!isRecord(value) || !isRecord(value.meta)) {
    throw new Error('Dictionary gateway response must include data and metadata.');
  }

  if (typeof value.meta.cached !== 'boolean') {
    throw new Error('Dictionary response metadata is invalid.');
  }

  return {
    lookup: parseDictionaryLookup(value.data),
    metadata: {
      requestId: readString(value.meta.requestId, 'meta.requestId', 200, true),
      cached: value.meta.cached,
    },
  };
}
