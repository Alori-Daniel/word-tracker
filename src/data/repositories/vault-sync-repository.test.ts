import type { SQLiteDatabase } from 'expo-sqlite';

import type { GuestIdentity } from '@/domain/vocabulary';

import type { CategoryRow, ReviewRow, WordRow } from '../database/rows';
import {
  LocalVaultChangedDuringSyncError,
  VaultSyncRepository,
} from './vault-sync-repository';

const identity: GuestIdentity = {
  localUserId: 'local-1',
  deviceId: 'device-1',
  linkedUserId: 'user-1',
  createdAt: '2026-09-25T00:00:00.000Z',
  updatedAt: '2026-09-25T00:00:00.000Z',
};

const category: CategoryRow = {
  id: 'category-1',
  user_id: 'user-1',
  local_user_id: 'local-1',
  name: 'General',
  normalized_name: 'general',
  color: '#0878B8',
  is_default: 1,
  sync_status: 'pending',
  created_at: '2026-09-25T00:00:00.000Z',
  updated_at: '2026-09-25T00:00:00.000Z',
  deleted_at: null,
};

describe('VaultSyncRepository', () => {
  it('exports local rows using the authenticated cloud owner', async () => {
    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes('FROM categories')) return [category];
      if (sql.includes('FROM words')) return [] as WordRow[];
      return [] as ReviewRow[];
    });
    const repository = new VaultSyncRepository(
      { getAllAsync } as unknown as SQLiteDatabase,
      identity,
    );

    await expect(repository.createSnapshot('user-1')).resolves.toEqual({
      categories: [
        expect.objectContaining({
          id: 'category-1',
          user_id: 'user-1',
          is_default: true,
        }),
      ],
      words: [],
      reviews: [],
    });
  });

  it('does not replace local data if it changed during sync', async () => {
    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes('FROM categories')) {
        return [{ ...category, updated_at: '2026-09-25T01:00:00.000Z' }];
      }
      return [];
    });
    const runAsync = jest.fn();
    const withTransactionAsync = jest.fn(async (operation: () => Promise<void>) => operation());
    const repository = new VaultSyncRepository(
      { getAllAsync, runAsync, withTransactionAsync } as unknown as SQLiteDatabase,
      identity,
    );
    const expected = {
      categories: [
        {
          id: 'category-1',
          user_id: 'user-1',
          name: 'General',
          normalized_name: 'general',
          color: '#0878B8',
          is_default: true,
          created_at: '2026-09-25T00:00:00.000Z',
          updated_at: '2026-09-25T00:00:00.000Z',
          deleted_at: null,
        },
      ],
      words: [],
      reviews: [],
    };

    await expect(repository.replaceIfUnchanged(expected, expected)).rejects.toBeInstanceOf(
      LocalVaultChangedDuringSyncError,
    );
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('replaces a matching snapshot in foreign-key-safe order', async () => {
    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes('FROM categories')) return [category];
      return [];
    });
    const runAsync = jest.fn(async (_sql: string, ..._parameters: unknown[]) => ({
      changes: 1,
      lastInsertRowId: 0,
    }));
    const withTransactionAsync = jest.fn(async (operation: () => Promise<void>) => operation());
    const repository = new VaultSyncRepository(
      { getAllAsync, runAsync, withTransactionAsync } as unknown as SQLiteDatabase,
      identity,
    );
    const snapshot = await repository.createSnapshot('user-1');

    await expect(repository.replaceIfUnchanged(snapshot, snapshot)).resolves.toBeUndefined();

    expect(String(runAsync.mock.calls[0][0])).toContain('DELETE FROM reviews');
    expect(String(runAsync.mock.calls[1][0])).toContain('DELETE FROM words');
    expect(String(runAsync.mock.calls[2][0])).toContain('DELETE FROM categories');
    expect(String(runAsync.mock.calls[3][0])).toContain('INSERT INTO categories');
  });
});
