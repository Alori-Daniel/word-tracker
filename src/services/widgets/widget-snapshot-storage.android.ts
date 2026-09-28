import { SQLiteStorage } from 'expo-sqlite/kv-store';

import type { VocabularyWidgetSnapshot } from '@/domain/widget';

import { deserializeVocabularyWidgetSnapshot } from './widget-snapshot-codec';

const WIDGET_DATABASE_NAME = 'wordecho-widget.db';
const WIDGET_SNAPSHOT_KEY = 'vocabulary_widget_snapshot';

const widgetStorage = new SQLiteStorage(WIDGET_DATABASE_NAME);

export async function loadVocabularyWidgetSnapshot(): Promise<VocabularyWidgetSnapshot | null> {
  const value = await widgetStorage.getItemAsync(WIDGET_SNAPSHOT_KEY);
  return deserializeVocabularyWidgetSnapshot(value);
}

export async function saveVocabularyWidgetSnapshot(
  snapshot: VocabularyWidgetSnapshot,
): Promise<void> {
  await widgetStorage.setItemAsync(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
}
