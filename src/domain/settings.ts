import {
  DEFAULT_WIDGET_PREFERENCES,
  type WidgetPreferences,
} from './widget';

export const THEME_MODES = ['system', 'light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export type LocalSettings = {
  themeMode: ThemeMode;
  onboardingCompleted: boolean;
  reviewRemindersEnabled: boolean;
  widgetPreferences: WidgetPreferences;
};

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  themeMode: 'system',
  onboardingCompleted: false,
  reviewRemindersEnabled: false,
  widgetPreferences: DEFAULT_WIDGET_PREFERENCES,
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.includes(value as ThemeMode);
}
