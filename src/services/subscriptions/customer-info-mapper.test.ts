import type { PurchasesEntitlementInfo } from 'react-native-purchases';

import { subscriptionSnapshotFromCustomerInfo } from './customer-info-mapper';

function entitlement(
  overrides: Partial<PurchasesEntitlementInfo> = {},
): PurchasesEntitlementInfo {
  return {
    identifier: 'premium',
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    latestPurchaseDate: '2026-09-29T00:00:00.000Z',
    latestPurchaseDateMillis: 1,
    originalPurchaseDate: '2026-09-29T00:00:00.000Z',
    originalPurchaseDateMillis: 1,
    expirationDate: '2026-10-29T00:00:00.000Z',
    expirationDateMillis: 2,
    store: 'APP_STORE',
    productIdentifier: 'wordecho_premium_monthly',
    productPlanIdentifier: null,
    isSandbox: true,
    unsubscribeDetectedAt: null,
    unsubscribeDetectedAtMillis: null,
    billingIssueDetectedAt: null,
    billingIssueDetectedAtMillis: null,
    ownershipType: 'PURCHASED',
    verification: 'NOT_REQUESTED' as PurchasesEntitlementInfo['verification'],
    ...overrides,
  };
}

function customerInfo(
  all: Record<string, PurchasesEntitlementInfo> = {},
  active: Record<string, PurchasesEntitlementInfo> = {},
) {
  return { entitlements: { active, all }, managementURL: null };
}

describe('RevenueCat customer info mapping', () => {
  it('maps a trial entitlement to active Premium access', () => {
    const premium = entitlement({ periodType: 'TRIAL' });

    expect(subscriptionSnapshotFromCustomerInfo(customerInfo({ premium }, { premium }))).toEqual({
      expirationDate: '2026-10-29T00:00:00.000Z',
      isPremium: true,
      isTrial: true,
      managementUrl: null,
      productId: 'wordecho_premium_monthly',
      status: 'trialing',
      willRenew: true,
    });
  });

  it('keeps cancelled but unexpired access active', () => {
    const premium = entitlement({ willRenew: false, unsubscribeDetectedAt: '2026-10-01' });

    expect(
      subscriptionSnapshotFromCustomerInfo(customerInfo({ premium }, { premium })),
    ).toMatchObject({ isPremium: true, status: 'premium', willRenew: false });
  });

  it('distinguishes expired customers from customers who never subscribed', () => {
    const expired = entitlement({ isActive: false });

    expect(subscriptionSnapshotFromCustomerInfo(customerInfo({ premium: expired })).status).toBe(
      'expired',
    );
    expect(subscriptionSnapshotFromCustomerInfo(customerInfo()).status).toBe('free');
  });
});
