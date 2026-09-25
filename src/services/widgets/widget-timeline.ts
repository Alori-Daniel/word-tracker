import type { VocabularyWidgetSnapshot } from '@/domain/widget';

export type VocabularyWidgetTimelineEntry = {
  date: Date;
  props: VocabularyWidgetSnapshot;
};

export function buildVocabularyWidgetTimeline(
  snapshot: VocabularyWidgetSnapshot,
  start = new Date(),
): VocabularyWidgetTimelineEntry[] {
  const intervalMs = snapshot.preferences.rotationMinutes * 60_000;
  const entryCount =
    snapshot.preferences.rotationMinutes === 1_440
      ? 14
      : Math.min(48, Math.ceil((24 * 60) / snapshot.preferences.rotationMinutes) + 1);

  return Array.from({ length: entryCount }, (_, index) => ({
    date: new Date(start.getTime() + intervalMs * index),
    props: {
      ...snapshot,
      currentIndex: snapshot.words.length
        ? (snapshot.currentIndex + index) % snapshot.words.length
        : 0,
    },
  }));
}
