import type { LocalRepositories } from '@/data/repositories/create-repositories';
import { LocalVaultChangedDuringSyncError } from '@/data/repositories/vault-sync-repository';
import type { CloudVaultSyncResult } from '@/domain/cloud-vault';

import { CloudVaultError, type SupabaseVaultClient } from './supabase-vault-client';

const MAX_ATTEMPTS = 2;

export async function syncVault(
  repositories: LocalRepositories,
  client: SupabaseVaultClient,
  userId: string,
): Promise<CloudVaultSyncResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const localSnapshot = await repositories.sync.createSnapshot(userId);
    const result = await client.sync(localSnapshot);

    if (
      result.profile.userId !== userId ||
      result.snapshot.categories.some((row) => row.user_id !== userId) ||
      result.snapshot.words.some((row) => row.user_id !== userId) ||
      result.snapshot.reviews.some((row) => row.user_id !== userId)
    ) {
      throw new CloudVaultError('Cloud backup returned data for an unexpected account.');
    }

    try {
      await repositories.sync.replaceIfUnchanged(localSnapshot, result.snapshot);
      return result;
    } catch (error) {
      if (!(error instanceof LocalVaultChangedDuringSyncError) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error('Cloud sync did not complete.');
}
