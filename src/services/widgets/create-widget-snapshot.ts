import type { Category, VocabularyWord } from '@/domain/vocabulary';
import type {
  VocabularyWidgetSnapshot,
  VocabularyWidgetWord,
  WidgetPreferences,
} from '@/domain/widget';

const MAX_WIDGET_WORDS = 24;

function stableHash(value: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function sourceLabel(preferences: WidgetPreferences, categoryName: string | null): string {
  const contentLabel = {
    recent: 'Recently added',
    learning: 'Learning words',
    favorites: 'Favourites',
    random: 'From your vault',
  }[preferences.contentSource];

  return categoryName ? `${contentLabel} · ${categoryName}` : contentLabel;
}

export function createVocabularyWidgetSnapshot(
  words: readonly VocabularyWord[],
  categories: readonly Category[],
  preferences: WidgetPreferences,
  now = new Date(),
): VocabularyWidgetSnapshot {
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const selectedCategoryId =
    preferences.categoryId && categoryById.has(preferences.categoryId)
      ? preferences.categoryId
      : null;
  const effectivePreferences =
    selectedCategoryId === preferences.categoryId
      ? preferences
      : { ...preferences, categoryId: selectedCategoryId };
  const selectedCategoryName = selectedCategoryId
    ? categoryById.get(selectedCategoryId) ?? null
    : null;
  const categoryWords = selectedCategoryId
    ? words.filter((word) => word.categoryId === selectedCategoryId)
    : [...words];
  let candidates: VocabularyWord[];

  switch (effectivePreferences.contentSource) {
    case 'favorites':
      candidates = categoryWords.filter((word) => word.isFavorite);
      break;
    case 'learning':
      candidates = categoryWords.filter((word) => word.status === 'learning');
      break;
    case 'random': {
      const bucket = Math.floor(
        now.getTime() / (effectivePreferences.rotationMinutes * 60_000),
      );
      candidates = [...categoryWords].sort(
        (left, right) =>
          stableHash(`${left.id}:${bucket}`) - stableHash(`${right.id}:${bucket}`),
      );
      break;
    }
    case 'recent':
    default:
      candidates = categoryWords;
  }

  const widgetWords: VocabularyWidgetWord[] = candidates
    .slice(0, MAX_WIDGET_WORDS)
    .map((word) => ({
      id: word.id,
      word: word.word,
      definition: word.simpleDefinition ?? word.definition,
      pronunciation: word.pronunciation,
      partOfSpeech: word.partOfSpeech,
      example: word.examples[0] ?? null,
      categoryName: word.categoryId ? categoryById.get(word.categoryId) ?? null : null,
      status: word.status,
      isFavorite: word.isFavorite,
    }));

  return {
    version: 1,
    words: widgetWords,
    currentIndex: 0,
    generatedAt: now.toISOString(),
    preferences: effectivePreferences,
    sourceLabel: sourceLabel(effectivePreferences, selectedCategoryName),
  };
}

export function advanceVocabularyWidgetSnapshot(
  snapshot: VocabularyWidgetSnapshot,
  now = new Date(),
): VocabularyWidgetSnapshot {
  return {
    ...snapshot,
    currentIndex: snapshot.words.length
      ? (snapshot.currentIndex + 1) % snapshot.words.length
      : 0,
    generatedAt: now.toISOString(),
  };
}

export function shouldRotateVocabularyWidget(
  snapshot: VocabularyWidgetSnapshot,
  now = new Date(),
): boolean {
  const generatedAt = Date.parse(snapshot.generatedAt);
  return (
    snapshot.words.length > 1 &&
    Number.isFinite(generatedAt) &&
    now.getTime() - generatedAt >= snapshot.preferences.rotationMinutes * 60_000
  );
}
