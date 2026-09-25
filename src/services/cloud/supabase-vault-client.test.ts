import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseVaultClient } from './supabase-vault-client';

describe('SupabaseVaultClient', () => {
  it('sends the complete local snapshot to one transactional RPC', async () => {
    const snapshot = { categories: [], words: [], reviews: [] };
    const response = {
      profile: {
        id: 'user-1',
        email: 'person@example.com',
        display_name: null,
        avatar_url: null,
        subscription_status: 'free',
      },
      snapshot,
    };
    const rpc = jest.fn(async () => ({ data: response, error: null }));
    const client = new SupabaseVaultClient({ rpc } as unknown as SupabaseClient);

    await expect(client.sync(snapshot)).resolves.toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({ userId: 'user-1' }),
        snapshot,
      }),
    );
    expect(rpc).toHaveBeenCalledWith('sync_vault', { p_snapshot: snapshot });
  });
});
