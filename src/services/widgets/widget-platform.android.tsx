import { requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';

import type { VocabularyWidgetSnapshot } from '@/domain/widget';
import { createWordEchoAndroidRepresentation } from '@/widgets/wordecho-widget.android';

import { saveVocabularyWidgetSnapshot } from './widget-snapshot-storage.android';

export const WORD_ECHO_WIDGET_NAME = 'WordEchoWidget';

export async function syncVocabularyWidget(
  snapshot: VocabularyWidgetSnapshot,
): Promise<void> {
  await saveVocabularyWidgetSnapshot(snapshot);
  await requestWidgetUpdate({
    widgetName: WORD_ECHO_WIDGET_NAME,
    renderWidget: (widgetInfo) =>
      createWordEchoAndroidRepresentation(snapshot, widgetInfo),
  });
}

export function requestPinVocabularyWidget(): Promise<boolean> {
  return requestPinWidget({ widgetName: WORD_ECHO_WIDGET_NAME });
}
