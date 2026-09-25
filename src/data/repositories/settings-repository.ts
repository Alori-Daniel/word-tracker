import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DEFAULT_LOCAL_SETTINGS,
  isThemeMode,
  type LocalSettings,
  type ThemeMode,
} from '@/domain/settings';

import type { SettingRow } from '../database/rows';
import type { RepositoryDependencies } from './repository-dependencies';

const SETTING_KEYS = {
  themeMode: 'theme_mode',
  onboardingCompleted: 'onboarding_completed',
  reviewRemindersEnabled: 'review_reminders_enabled',
} as const;

function safelyParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export class SettingsRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly dependencies: RepositoryDependencies,
  ) {}

  async getAll(): Promise<LocalSettings> {
    const rows = await this.database.getAllAsync<SettingRow>(
      'SELECT setting_key, value_json, updated_at FROM settings',
    );
    const values = new Map(rows.map((row) => [row.setting_key, safelyParse(row.value_json)]));
    const themeMode = values.get(SETTING_KEYS.themeMode);
    const onboardingCompleted = values.get(SETTING_KEYS.onboardingCompleted);
    const reviewRemindersEnabled = values.get(SETTING_KEYS.reviewRemindersEnabled);

    return {
      themeMode: isThemeMode(themeMode) ? themeMode : DEFAULT_LOCAL_SETTINGS.themeMode,
      onboardingCompleted:
        typeof onboardingCompleted === 'boolean'
          ? onboardingCompleted
          : DEFAULT_LOCAL_SETTINGS.onboardingCompleted,
      reviewRemindersEnabled:
        typeof reviewRemindersEnabled === 'boolean'
          ? reviewRemindersEnabled
          : DEFAULT_LOCAL_SETTINGS.reviewRemindersEnabled,
    };
  }

  setThemeMode(themeMode: ThemeMode): Promise<void> {
    return this.setValue(SETTING_KEYS.themeMode, themeMode);
  }

  setOnboardingCompleted(completed: boolean): Promise<void> {
    return this.setValue(SETTING_KEYS.onboardingCompleted, completed);
  }

  setReviewRemindersEnabled(enabled: boolean): Promise<void> {
    return this.setValue(SETTING_KEYS.reviewRemindersEnabled, enabled);
  }

  private async setValue(key: string, value: unknown): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO settings (setting_key, value_json, updated_at)
       VALUES ($key, $valueJson, $updatedAt)
       ON CONFLICT(setting_key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at`,
      {
        $key: key,
        $valueJson: JSON.stringify(value),
        $updatedAt: this.dependencies.now(),
      },
    );
  }
}
