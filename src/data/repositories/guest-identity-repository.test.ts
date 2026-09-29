import type { SQLiteDatabase } from 'expo-sqlite';

import type { LocalIdentityRow } from '../database/rows';
import { GuestIdentityRepository } from './guest-identity-repository';

const identityRow: LocalIdentityRow = {
  local_user_id: 'local-id',
  device_id: 'device-id',
  user_id: null,
  created_at: '2026-09-25T00:00:00.000Z',
  updated_at: '2026-09-25T00:00:00.000Z',
};

const dependencies = {
  createId: () => 'generated-id',
  now: () => '2026-09-25T00:00:00.000Z',
};

describe('GuestIdentityRepository', () => {
  it('creates one stable app-scoped guest identity', async () => {
    let storedRow: LocalIdentityRow | null = null;
    const database = {
      getFirstAsync: jest.fn(async () => storedRow),
      runAsync: jest.fn(async (_sql: string, parameters: Record<string, unknown>) => {
        storedRow = {
          local_user_id: parameters.$localUserId as string,
          device_id: parameters.$deviceId as string,
          user_id: null,
          created_at: parameters.$createdAt as string,
          updated_at: parameters.$updatedAt as string,
        };
        return { changes: 1, lastInsertRowId: 1 };
      }),
    } as unknown as SQLiteDatabase;
    const generatedIds = ['local-id', 'device-id'];
    const repository = new GuestIdentityRepository(database, {
      createId: () => generatedIds.shift()!,
      now: () => '2026-09-25T00:00:00.000Z',
    });

    const first = await repository.getOrCreate();
    const second = await repository.getOrCreate();

    expect(first).toEqual(second);
    expect(first).toMatchObject({ localUserId: 'local-id', deviceId: 'device-id' });
    expect(database.runAsync).toHaveBeenCalledTimes(1);
  });

  it('links existing guest rows to an account in one transaction', async () => {
    const linkedRow = { ...identityRow, user_id: 'user-1' };
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce(identityRow)
      .mockResolvedValueOnce(linkedRow);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const withTransactionAsync = jest.fn(async (operation: () => Promise<void>) => operation());
    const repository = new GuestIdentityRepository(
      { getFirstAsync, runAsync, withTransactionAsync } as unknown as SQLiteDatabase,
      dependencies,
    );

    await expect(
      repository.linkAccount({
        userId: 'user-1',
        email: 'person@example.com',
        displayName: 'Ada Reader',
        avatarUrl: null,
        provider: 'google',
        subscriptionStatus: 'free',
      }),
    ).resolves.toEqual(expect.objectContaining({ linkedUserId: 'user-1' }));

    expect(withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenCalledTimes(6);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("sync_status = 'pending'"),
      expect.objectContaining({ $userId: 'user-1' }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE feature_usage_events'),
      expect.objectContaining({ $localUserId: 'local-id', $userId: 'user-1' }),
    );
  });
});
