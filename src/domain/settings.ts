import {
  DEFAULT_WIDGET_PREFERENCES,
  type WidgetPreferences,
} from './widget';

export const THEME_MODES = ['system', 'light', 'dark'] as const;
export const DEFAULT_REVIEW_REMINDER_TIME = '08:00';

export type ThemeMode = (typeof THEME_MODES)[number];

export type LocalSettings = {
  themeMode: ThemeMode;
  onboardingCompleted: boolean;
  reviewRemindersEnabled: boolean;
  reviewReminderTime: string;
  widgetPreferences: WidgetPreferences;
};

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  themeMode: 'system',
  onboardingCompleted: false,
  reviewRemindersEnabled: false,
  reviewReminderTime: DEFAULT_REVIEW_REMINDER_TIME,
  widgetPreferences: DEFAULT_WIDGET_PREFERENCES,
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.includes(value as ThemeMode);
}

export function isReviewReminderTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;

  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
