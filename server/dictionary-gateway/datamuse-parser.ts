import type { DictionaryLookup, DictionarySense } from '../../src/domain/dictionary';

const PROVIDER_NAME = 'Datamuse';
const PROVIDER_URL = 'https://www.datamuse.com/api/';

export class DatamuseEntryNotFoundError extends Error {
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

function parseDefinition(value: string): { definition: string; partOfSpeech: string | null } | null {
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

export function parseDatamuseResponse(value: unknown, fallbackWord: string): DictionaryLookup {
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
      providerName: PROVIDER_NAME,
      providerUrl: PROVIDER_URL,
      sourceUrl: null,
      licenseName: null,
      licenseUrl: null,
    },
  };
}
