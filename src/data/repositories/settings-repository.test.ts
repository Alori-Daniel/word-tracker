import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_WIDGET_PREFERENCES } from '@/domain/widget';

import { SettingsRepository } from './settings-repository';

describe('SettingsRepository', () => {
  it('restores valid settings and falls back for malformed values', async () => {
    const database = {
      getAllAsync: jest.fn(async () => [
        { setting_key: 'theme_mode', value_json: '"dark"', updated_at: 'timestamp' },
        { setting_key: 'onboarding_completed', value_json: 'not-json', updated_at: 'timestamp' },
        { setting_key: 'review_reminders_enabled', value_json: 'true', updated_at: 'timestamp' },
      ]),
    } as unknown as SQLiteDatabase;
    const repository = new SettingsRepository(database, {
      createId: () => 'unused',
      now: () => 'timestamp',
    });

    await expect(repository.getAll()).resolves.toEqual({
      themeMode: 'dark',
      onboardingCompleted: false,
      reviewRemindersEnabled: true,
      widgetPreferences: DEFAULT_WIDGET_PREFERENCES,
    });
  });

  it('persists settings as parameterized JSON values', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const database = { runAsync } as unknown as SQLiteDatabase;
    const repository = new SettingsRepository(database, {
      createId: () => 'unused',
      now: () => '2026-09-25T00:00:00.000Z',
    });

    await repository.setThemeMode('light');

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(setting_key)'),
      expect.objectContaining({
        $key: 'theme_mode',
        $valueJson: '"light"',
      }),
    );
  });

  it('persists completion of guest onboarding', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const database = { runAsync } as unknown as SQLiteDatabase;
    const repository = new SettingsRepository(database, {
      createId: () => 'unused',
      now: () => '2026-09-25T00:00:00.000Z',
    });

    await repository.setOnboardingCompleted(true);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(setting_key)'),
      expect.objectContaining({
        $key: 'onboarding_completed',
        $valueJson: 'true',
      }),
    );
  });

  it('persists widget preferences as one validated setting', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const database = { runAsync } as unknown as SQLiteDatabase;
    const repository = new SettingsRepository(database, {
      createId: () => 'unused',
      now: () => '2026-09-25T00:00:00.000Z',
    });
    const preferences = {
      categoryId: 'category-1',
      contentSource: 'favorites',
      rotationMinutes: 180,
      themeMode: 'dark',
    } as const;

    await repository.setWidgetPreferences(preferences);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(setting_key)'),
      expect.objectContaining({
        $key: 'widget_preferences',
        $valueJson: JSON.stringify(preferences),
      }),
    );
  });
});
