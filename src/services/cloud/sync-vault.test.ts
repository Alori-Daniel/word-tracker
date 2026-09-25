import type { LocalRepositories } from '@/data/repositories/create-repositories';
import { LocalVaultChangedDuringSyncError } from '@/data/repositories/vault-sync-repository';
import type { CloudVaultSnapshot, CloudVaultSyncResult } from '@/domain/cloud-vault';

import type { SupabaseVaultClient } from './supabase-vault-client';
import { syncVault } from './sync-vault';

const snapshot: CloudVaultSnapshot = { categories: [], words: [], reviews: [] };
const result: CloudVaultSyncResult = {
  profile: {
    userId: 'user-1',
    email: 'person@example.com',
    displayName: null,
    avatarUrl: null,
    subscriptionStatus: 'free',
  },
  snapshot,
};

describe('syncVault', () => {
  it('retries once if local data changes during the network request', async () => {
    const createSnapshot = jest.fn(async () => snapshot);
    const replaceIfUnchanged = jest
      .fn()
      .mockRejectedValueOnce(new LocalVaultChangedDuringSyncError())
      .mockResolvedValueOnce(undefined);
    const client = { sync: jest.fn(async () => result) } as unknown as SupabaseVaultClient;
    const repositories = {
      sync: { createSnapshot, replaceIfUnchanged },
    } as unknown as LocalRepositories;

    await expect(syncVault(repositories, client, 'user-1')).resolves.toEqual(result);
    expect(createSnapshot).toHaveBeenCalledTimes(2);
    expect(client.sync).toHaveBeenCalledTimes(2);
    expect(replaceIfUnchanged).toHaveBeenCalledTimes(2);
  });

  it('rejects a cloud response scoped to another account', async () => {
    const repositories = {
      sync: {
        createSnapshot: jest.fn(async () => snapshot),
        replaceIfUnchanged: jest.fn(),
      },
    } as unknown as LocalRepositories;
    const client = {
      sync: jest.fn(async () => ({
        ...result,
        profile: { ...result.profile, userId: 'user-2' },
      })),
    } as unknown as SupabaseVaultClient;

    await expect(syncVault(repositories, client, 'user-1')).rejects.toThrow(
      'unexpected account',
    );
    expect(repositories.sync.replaceIfUnchanged).not.toHaveBeenCalled();
  });
});
