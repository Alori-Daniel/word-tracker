import type { VocabularyWidgetSnapshot } from '@/domain/widget';

/**
 * Expo Widgets persists iOS timeline props in the shared UserDefaults suite.
 * NSNull is not a valid property-list value, so nullable strings must be
 * represented by an empty string before the snapshot crosses the native bridge.
 */
export function toIosPropertyListWidgetSnapshot(
  snapshot: VocabularyWidgetSnapshot,
): VocabularyWidgetSnapshot {
  return {
    ...snapshot,
    preferences: {
      ...snapshot.preferences,
      categoryId: snapshot.preferences.categoryId ?? '',
    },
    words: snapshot.words.map((word) => ({
      ...word,
      categoryName: word.categoryName ?? '',
      example: word.example ?? '',
      partOfSpeech: word.partOfSpeech ?? '',
      pronunciation: word.pronunciation ?? '',
    })),
  };
}
