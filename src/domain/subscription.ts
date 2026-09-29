import type { SubscriptionStatus } from './account';

export const PREMIUM_ENTITLEMENT_ID = 'premium' as const;
export const PREMIUM_TRIAL_DAYS = 7 as const;
export const FREE_CSV_IMPORT_LIMIT = 5 as const;
export const CSV_EXPORTS_ARE_UNLIMITED = true as const;

export const SUBSCRIPTION_PRODUCT_IDS = {
  monthly: 'wordecho_premium_monthly',
  annual: 'wordecho_premium_annual',
} as const;

export const BILLING_LIFECYCLE_STATUSES = [
  'inactive',
  'trialing',
  'active',
  'grace_period',
  'billing_issue',
  'expired',
] as const;

export type BillingLifecycleStatus = (typeof BILLING_LIFECYCLE_STATUSES)[number];
export type SubscriptionProductPeriod = keyof typeof SUBSCRIPTION_PRODUCT_IDS;

export type CsvImportAllowance = {
  allowed: boolean;
  limit: number | null;
  reason: 'premium' | 'free_allowance' | 'limit_reached';
  remaining: number | null;
  used: number;
};

export function hasPremiumAccess(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'premium';
}

export function getCsvImportAllowance(
  status: SubscriptionStatus,
  completedFreeImports: number,
): CsvImportAllowance {
  const used = Number.isFinite(completedFreeImports)
    ? Math.max(0, Math.floor(completedFreeImports))
    : 0;

  if (hasPremiumAccess(status)) {
    return {
      allowed: true,
      limit: null,
      reason: 'premium',
      remaining: null,
      used,
    };
  }

  const remaining = Math.max(0, FREE_CSV_IMPORT_LIMIT - used);

  return {
    allowed: remaining > 0,
    limit: FREE_CSV_IMPORT_LIMIT,
    reason: remaining > 0 ? 'free_allowance' : 'limit_reached',
    remaining,
    used,
  };
}
