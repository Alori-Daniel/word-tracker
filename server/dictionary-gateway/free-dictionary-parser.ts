import type { DictionaryLookup, DictionarySense } from '../../src/domain/dictionary';

const PROVIDER_NAME = 'Free Dictionary API';
const PROVIDER_URL = 'https://dictionaryapi.dev/';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const values = value
    .map((item) => text(item, 120))
    .filter((item): item is string => item !== null);

  return [...new Set(values)].slice(0, 12);
}

function secureUrl(value: unknown): string | null {
  const candidate = text(value, 2_000);
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate.startsWith('//') ? `https:${candidate}` : candidate);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function firstString(value: unknown): string | null {
  if (!Array.isArray(value)) return null;

  for (const item of value) {
    const parsed = text(item, 2_000);
    if (parsed) return parsed;
  }

  return null;
}

function uniqueRelatedWords(...values: unknown[]): string[] {
  return [...new Set(values.flatMap(stringList))].slice(0, 12);
}

export function parseFreeDictionaryResponse(
  value: unknown,
  fallbackWord: string,
): DictionaryLookup {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('The dictionary provider returned no entries.');
  }

  const senses: DictionarySense[] = [];
  const seenSenses = new Set<string>();
  let resolvedWord: string | null = null;
  let pronunciation: string | null = null;
  let audioUrl: string | null = null;
  let sourceUrl: string | null = null;
  let licenseName: string | null = null;
  let licenseUrl: string | null = null;

  value.forEach((entryValue, entryIndex) => {
    if (!isRecord(entryValue)) return;

    resolvedWord ??= text(entryValue.word, 120);
    pronunciation ??= text(entryValue.phonetic, 160);
    sourceUrl ??= secureUrl(firstString(entryValue.sourceUrls));

    if (isRecord(entryValue.license)) {
      licenseName ??= text(entryValue.license.name, 200);
      licenseUrl ??= secureUrl(entryValue.license.url);
    }

    if (Array.isArray(entryValue.phonetics)) {
      for (const phonetic of entryValue.phonetics) {
        if (!isRecord(phonetic)) continue;
        pronunciation ??= text(phonetic.text, 160);
        audioUrl ??= secureUrl(phonetic.audio);
      }
    }

    if (!Array.isArray(entryValue.meanings)) return;

    entryValue.meanings.forEach((meaningValue, meaningIndex) => {
      if (!isRecord(meaningValue) || !Array.isArray(meaningValue.definitions)) return;

      const partOfSpeech = text(meaningValue.partOfSpeech, 80);

      meaningValue.definitions.forEach((definitionValue, definitionIndex) => {
        if (!isRecord(definitionValue) || senses.length >= 20) return;

        const definition = text(definitionValue.definition, 3_000);
        if (!definition) return;

        const dedupeKey = `${partOfSpeech?.toLowerCase() ?? ''}|${definition.toLowerCase()}`;
        if (seenSenses.has(dedupeKey)) return;
        seenSenses.add(dedupeKey);

        senses.push({
          id: `${entryIndex}-${meaningIndex}-${definitionIndex}`,
          definition,
          partOfSpeech,
          example: text(definitionValue.example, 700),
          synonyms: uniqueRelatedWords(meaningValue.synonyms, definitionValue.synonyms),
          antonyms: uniqueRelatedWords(meaningValue.antonyms, definitionValue.antonyms),
        });
      });
    });
  });

  if (senses.length === 0) {
    throw new Error('The dictionary provider returned no usable meanings.');
  }

  return {
    word: resolvedWord ?? fallbackWord,
    pronunciation,
    audioUrl,
    senses,
    attribution: {
      providerName: PROVIDER_NAME,
      providerUrl: PROVIDER_URL,
      sourceUrl,
      licenseName,
      licenseUrl,
    },
  };
}
