export const SUBSCRIPTION_STATUSES = ['free', 'trialing', 'premium', 'expired'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type AccountProfile = {
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: 'google';
  subscriptionStatus: SubscriptionStatus;
};

export type LinkAccountInput = AccountProfile;

export type CloudSyncState =
  | { status: 'disabled'; lastSyncedAt: null; message: string | null }
  | { status: 'idle'; lastSyncedAt: string | null; message: string | null }
  | { status: 'syncing'; lastSyncedAt: string | null; message: string | null }
  | { status: 'error'; lastSyncedAt: string | null; message: string };
