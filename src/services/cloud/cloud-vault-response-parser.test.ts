import { parseCloudVaultSyncResult } from './cloud-vault-response-parser';

const result = {
  profile: {
    id: 'user-1',
    email: 'person@example.com',
    display_name: 'Ada Reader',
    avatar_url: null,
    subscription_status: 'free',
  },
  snapshot: {
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
  },
};

describe('cloud vault response parser', () => {
  it('validates an account-scoped sync response', () => {
    expect(parseCloudVaultSyncResult(result)).toEqual({
      profile: {
        userId: 'user-1',
        email: 'person@example.com',
        displayName: 'Ada Reader',
        avatarUrl: null,
        subscriptionStatus: 'free',
      },
      snapshot: result.snapshot,
    });
  });

  it('rejects an unknown subscription value', () => {
    expect(() =>
      parseCloudVaultSyncResult({
        ...result,
        profile: { ...result.profile, subscription_status: 'administrator' },
      }),
    ).toThrow('invalid subscription status');
  });
});
