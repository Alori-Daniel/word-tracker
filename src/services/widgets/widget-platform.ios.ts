import type { VocabularyWidgetSnapshot } from '@/domain/widget';
import WordEchoWidget from '@/widgets/wordecho-widget.ios';

import { toIosPropertyListWidgetSnapshot } from './widget-property-list';
import { buildVocabularyWidgetTimeline } from './widget-timeline';

export async function syncVocabularyWidget(
  snapshot: VocabularyWidgetSnapshot,
): Promise<void> {
  const propertyListSnapshot = toIosPropertyListWidgetSnapshot(snapshot);

  WordEchoWidget.updateTimeline(buildVocabularyWidgetTimeline(propertyListSnapshot));
}

export async function requestPinVocabularyWidget(): Promise<boolean> {
  return false;
}
