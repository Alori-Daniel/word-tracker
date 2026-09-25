import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { DEFAULT_WIDGET_PREFERENCES, type VocabularyWidgetSnapshot } from '@/domain/widget';
import {
  advanceVocabularyWidgetSnapshot,
  shouldRotateVocabularyWidget,
} from '@/services/widgets/create-widget-snapshot';
import {
  loadVocabularyWidgetSnapshot,
  saveVocabularyWidgetSnapshot,
} from '@/services/widgets/widget-snapshot-storage.android';

import { createVocabularyVaultAndroidRepresentation } from './vocabulary-vault-widget.android';

const WIDGET_NAME = 'VocabularyVaultWidget';

function createEmptySnapshot(): VocabularyWidgetSnapshot {
  return {
    currentIndex: 0,
    generatedAt: new Date().toISOString(),
    preferences: DEFAULT_WIDGET_PREFERENCES,
    sourceLabel: 'Learning words',
    version: 1,
    words: [],
  };
}

registerWidgetTaskHandler(async (props) => {
  if (props.widgetInfo.widgetName !== WIDGET_NAME || props.widgetAction === 'WIDGET_DELETED') {
    return;
  }

  let snapshot = (await loadVocabularyWidgetSnapshot()) ?? createEmptySnapshot();
  const shouldAdvance =
    (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'NEXT_WORD') ||
    (props.widgetAction === 'WIDGET_UPDATE' && shouldRotateVocabularyWidget(snapshot));

  if (shouldAdvance) {
    snapshot = advanceVocabularyWidgetSnapshot(snapshot);
    await saveVocabularyWidgetSnapshot(snapshot);
  }

  props.renderWidget(
    createVocabularyVaultAndroidRepresentation(snapshot, props.widgetInfo),
  );
});
