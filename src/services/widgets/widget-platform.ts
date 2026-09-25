import type { VocabularyWidgetSnapshot } from '@/domain/widget';

export function syncVocabularyWidget(snapshot: VocabularyWidgetSnapshot): Promise<void> {
  void snapshot;
  return Promise.resolve();
}

export function requestPinVocabularyWidget(): Promise<boolean> {
  return Promise.resolve(false);
}
