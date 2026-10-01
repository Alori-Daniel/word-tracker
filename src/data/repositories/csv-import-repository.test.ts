import type { SQLiteDatabase } from 'expo-sqlite';

import type { GuestIdentity } from '@/domain/vocabulary';

import { CsvImportLimitError, CsvImportRepository } from './csv-import-repository';

const identity: GuestIdentity = {
  localUserId: 'guest-1',
  deviceId: 'device-1',
  linkedUserId: null,
  createdAt: '2026-09-25T00:00:00.000Z',
  updatedAt: '2026-09-25T00:00:00.000Z',
};

describe('CsvImportRepository', () => {
  it('reports completed imports for the local vault', async () => {
    const getFirstAsync = jest.fn(async () => ({ count: 3 }));
    const repository = new CsvImportRepository(
      { getFirstAsync } as unknown as SQLiteDatabase,
      identity,
      { createId: () => 'id', now: () => '2026-10-01T00:00:00.000Z' },
    );
    await expect(repository.countCompleted()).resolves.toBe(3);
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("feature_key = 'csv_import'"),
      { $localUserId: 'guest-1' },
    );
  });

  it('rejects a sixth free import before writing', async () => {
    const database = {
      getFirstAsync: jest.fn(async () => ({ count: 5 })),
      withTransactionAsync: jest.fn(async (operation: () => Promise<void>) => operation()),
      runAsync: jest.fn(),
    } as unknown as SQLiteDatabase;
    const repository = new CsvImportRepository(database, identity, {
      createId: () => 'id',
      now: () => '2026-10-01T00:00:00.000Z',
    });

    await expect(
      repository.import(
        [{ rowNumber: 2, categoryName: null, input: { word: 'Novel', definition: 'New.' } }],
        false,
      ),
    ).rejects.toBeInstanceOf(CsvImportLimitError);
    expect(database.runAsync).not.toHaveBeenCalled();
  });
});
