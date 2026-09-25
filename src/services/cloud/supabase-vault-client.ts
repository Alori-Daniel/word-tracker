import type { SupabaseClient } from '@supabase/supabase-js';

import type { CloudVaultSnapshot, CloudVaultSyncResult } from '@/domain/cloud-vault';

import { parseCloudVaultSyncResult } from './cloud-vault-response-parser';

export class CloudVaultError extends Error {
  constructor(message = 'Your vault could not sync. Please try again.') {
    super(message);
    this.name = 'CloudVaultError';
  }
}

export class SupabaseVaultClient {
  constructor(private readonly client: SupabaseClient) {}

  async sync(snapshot: CloudVaultSnapshot): Promise<CloudVaultSyncResult> {
    const { data, error } = await this.client.rpc('sync_vault', {
      p_snapshot: snapshot,
    });

    if (error) {
      throw new CloudVaultError();
    }

    try {
      return parseCloudVaultSyncResult(data);
    } catch {
      throw new CloudVaultError('Cloud backup returned an unexpected response.');
    }
  }
}
