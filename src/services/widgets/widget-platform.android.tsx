import { requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';

import type { VocabularyWidgetSnapshot } from '@/domain/widget';
import { createVocabularyVaultAndroidRepresentation } from '@/widgets/vocabulary-vault-widget.android';

import { saveVocabularyWidgetSnapshot } from './widget-snapshot-storage.android';

export const VOCABULARY_VAULT_WIDGET_NAME = 'VocabularyVaultWidget';

export async function syncVocabularyWidget(
  snapshot: VocabularyWidgetSnapshot,
): Promise<void> {
  await saveVocabularyWidgetSnapshot(snapshot);
  await requestWidgetUpdate({
    widgetName: VOCABULARY_VAULT_WIDGET_NAME,
    renderWidget: (widgetInfo) =>
      createVocabularyVaultAndroidRepresentation(snapshot, widgetInfo),
  });
}

export function requestPinVocabularyWidget(): Promise<boolean> {
  return requestPinWidget({ widgetName: VOCABULARY_VAULT_WIDGET_NAME });
}
