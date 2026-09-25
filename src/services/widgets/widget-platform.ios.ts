import type { VocabularyWidgetSnapshot } from '@/domain/widget';
import VocabularyVaultWidget from '@/widgets/vocabulary-vault-widget.ios';

import { buildVocabularyWidgetTimeline } from './widget-timeline';

export async function syncVocabularyWidget(
  snapshot: VocabularyWidgetSnapshot,
): Promise<void> {
  VocabularyVaultWidget.updateTimeline(buildVocabularyWidgetTimeline(snapshot));
}

export async function requestPinVocabularyWidget(): Promise<boolean> {
  return false;
}
