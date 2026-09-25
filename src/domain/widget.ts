import type { LearningStatus, VocabularyWord } from './vocabulary';

export const WIDGET_CONTENT_SOURCES = [
  'recent',
  'learning',
  'favorites',
  'random',
] as const;
export const WIDGET_ROTATION_MINUTES = [30, 60, 180, 1_440] as const;
export const WIDGET_THEME_MODES = ['system', 'light', 'dark'] as const;

export type WidgetContentSource = (typeof WIDGET_CONTENT_SOURCES)[number];
export type WidgetRotationMinutes = (typeof WIDGET_ROTATION_MINUTES)[number];
export type WidgetThemeMode = (typeof WIDGET_THEME_MODES)[number];

export type WidgetPreferences = {
  categoryId: string | null;
  contentSource: WidgetContentSource;
  rotationMinutes: WidgetRotationMinutes;
  themeMode: WidgetThemeMode;
};

export const DEFAULT_WIDGET_PREFERENCES: WidgetPreferences = {
  categoryId: null,
  contentSource: 'learning',
  rotationMinutes: 60,
  themeMode: 'system',
};

export type VocabularyWidgetWord = Pick<VocabularyWord, 'id' | 'word'> & {
  categoryName: string | null;
  definition: string;
  example: string | null;
  isFavorite: boolean;
  partOfSpeech: string | null;
  pronunciation: string | null;
  status: LearningStatus;
};

export type VocabularyWidgetSnapshot = {
  currentIndex: number;
  generatedAt: string;
  preferences: WidgetPreferences;
  sourceLabel: string;
  version: 1;
  words: VocabularyWidgetWord[];
};

export function isWidgetContentSource(value: unknown): value is WidgetContentSource {
  return (
    typeof value === 'string' &&
    WIDGET_CONTENT_SOURCES.includes(value as WidgetContentSource)
  );
}

export function isWidgetRotationMinutes(value: unknown): value is WidgetRotationMinutes {
  return (
    typeof value === 'number' &&
    WIDGET_ROTATION_MINUTES.includes(value as WidgetRotationMinutes)
  );
}

export function isWidgetThemeMode(value: unknown): value is WidgetThemeMode {
  return typeof value === 'string' && WIDGET_THEME_MODES.includes(value as WidgetThemeMode);
}

export function parseWidgetPreferences(value: unknown): WidgetPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return DEFAULT_WIDGET_PREFERENCES;
  }

  const candidate = value as Record<string, unknown>;

  return {
    categoryId:
      typeof candidate.categoryId === 'string' && candidate.categoryId.trim()
        ? candidate.categoryId
        : null,
    contentSource: isWidgetContentSource(candidate.contentSource)
      ? candidate.contentSource
      : DEFAULT_WIDGET_PREFERENCES.contentSource,
    rotationMinutes: isWidgetRotationMinutes(candidate.rotationMinutes)
      ? candidate.rotationMinutes
      : DEFAULT_WIDGET_PREFERENCES.rotationMinutes,
    themeMode: isWidgetThemeMode(candidate.themeMode)
      ? candidate.themeMode
      : DEFAULT_WIDGET_PREFERENCES.themeMode,
  };
}
