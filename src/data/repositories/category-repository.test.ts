import type { SQLiteDatabase } from 'expo-sqlite';

import type { GuestIdentity } from '@/domain/vocabulary';

import type { CategoryRow } from '../database/rows';
import { CategoryRepository, DuplicateCategoryError } from './category-repository';

const identity: GuestIdentity = {
  localUserId: 'guest-1',
  deviceId: 'device-1',
  linkedUserId: null,
  createdAt: '2026-09-25T00:00:00.000Z',
  updatedAt: '2026-09-25T00:00:00.000Z',
};

const categoryRow: CategoryRow = {
  id: 'category-1',
  user_id: null,
  local_user_id: 'guest-1',
  name: 'Reading',
  normalized_name: 'reading',
  color: '#0878B8',
  is_default: 0,
  sync_status: 'local',
  created_at: '2026-09-25T00:00:00.000Z',
  updated_at: '2026-09-25T00:00:00.000Z',
  deleted_at: null,
};

function createRepository(database: SQLiteDatabase) {
  return new CategoryRepository(database, identity, {
    createId: () => 'category-1',
    now: () => '2026-09-25T00:00:00.000Z',
  });
}

describe('CategoryRepository', () => {
  it('creates a normalized custom category for the guest', async () => {
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(categoryRow);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const repository = createRepository({ getFirstAsync, runAsync } as unknown as SQLiteDatabase);

    await expect(
      repository.create({ name: ' Reading ', color: '#0878B8' }),
    ).resolves.toEqual(expect.objectContaining({ id: 'category-1', name: 'Reading' }));
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      expect.objectContaining({
        $localUserId: 'guest-1',
        $name: 'Reading',
        $normalizedName: 'reading',
      }),
    );
  });

  it('rejects duplicate active category names', async () => {
    const runAsync = jest.fn();
    const database = {
      getFirstAsync: jest.fn(async () => categoryRow),
      runAsync,
    } as unknown as SQLiteDatabase;

    await expect(
      createRepository(database).create({ name: ' READING ', color: '#0878B8' }),
    ).rejects.toBeInstanceOf(DuplicateCategoryError);
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('removes a deleted custom category from its words in one transaction', async () => {
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce({ changes: 1, lastInsertRowId: 0 })
      .mockResolvedValueOnce({ changes: 2, lastInsertRowId: 0 });
    const database = {
      runAsync,
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    } as unknown as SQLiteDatabase;

    await expect(createRepository(database).softDelete('category-1')).resolves.toBe(true);
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET category_id = NULL'),
      expect.objectContaining({ $id: 'category-1', $localUserId: 'guest-1' }),
    );
  });
});
