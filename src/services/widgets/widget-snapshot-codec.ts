import {
  parseWidgetPreferences,
  type VocabularyWidgetSnapshot,
  type VocabularyWidgetWord,
} from '@/domain/widget';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNullableText(value: unknown, maxLength: number): string | null {
  if (value === null) return null;
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

function parseWord(value: unknown): VocabularyWidgetWord | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id || value.id.length > 200) return null;
  if (typeof value.word !== 'string' || !value.word || value.word.length > 120) return null;
  if (typeof value.definition !== 'string' || value.definition.length > 3_000) return null;
  if (!['learning', 'familiar', 'mastered'].includes(String(value.status))) return null;

  return {
    id: value.id,
    word: value.word,
    definition: value.definition,
    pronunciation: readNullableText(value.pronunciation, 160),
    partOfSpeech: readNullableText(value.partOfSpeech, 80),
    example: readNullableText(value.example, 700),
    categoryName: readNullableText(value.categoryName, 120),
    status: value.status as VocabularyWidgetWord['status'],
    isFavorite: value.isFavorite === true,
  };
}

export function parseVocabularyWidgetSnapshot(
  value: unknown,
): VocabularyWidgetSnapshot | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.words)) return null;
  if (value.words.length > 24 || typeof value.generatedAt !== 'string') return null;
  if (!Number.isFinite(Date.parse(value.generatedAt))) return null;

  const words = value.words.map(parseWord);
  if (words.some((word) => word === null)) return null;

  const currentIndex =
    typeof value.currentIndex === 'number' &&
    Number.isInteger(value.currentIndex) &&
    value.currentIndex >= 0
      ? value.currentIndex
      : 0;

  return {
    version: 1,
    words: words as VocabularyWidgetWord[],
    currentIndex: words.length ? currentIndex % words.length : 0,
    generatedAt: value.generatedAt,
    preferences: parseWidgetPreferences(value.preferences),
    sourceLabel:
      typeof value.sourceLabel === 'string' && value.sourceLabel.length <= 200
        ? value.sourceLabel
        : 'Vocabulary Vault',
  };
}

export function deserializeVocabularyWidgetSnapshot(
  serialized: string | null,
): VocabularyWidgetSnapshot | null {
  if (!serialized) return null;

  try {
    return parseVocabularyWidgetSnapshot(JSON.parse(serialized) as unknown);
  } catch {
    return null;
  }
}
