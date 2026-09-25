import type { SQLiteDatabase } from 'expo-sqlite';

import type { LocalIdentityRow } from '../database/rows';
import { GuestIdentityRepository } from './guest-identity-repository';

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
});
