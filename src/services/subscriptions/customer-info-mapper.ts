import type { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';

import type { SubscriptionStatus } from '@/domain/account';
import { PREMIUM_ENTITLEMENT_ID } from '@/domain/subscription';

export type SubscriptionSnapshot = {
  expirationDate: string | null;
  isPremium: boolean;
  isTrial: boolean;
  managementUrl: string | null;
  productId: string | null;
  status: SubscriptionStatus;
  willRenew: boolean;
};

export const FREE_SUBSCRIPTION_SNAPSHOT: SubscriptionSnapshot = {
  expirationDate: null,
  isPremium: false,
  isTrial: false,
  managementUrl: null,
  productId: null,
  status: 'free',
  willRenew: false,
};

type CustomerInfoShape = Pick<CustomerInfo, 'managementURL'> & {
  entitlements: {
    active: Record<string, PurchasesEntitlementInfo | undefined>;
    all: Record<string, PurchasesEntitlementInfo | undefined>;
  };
};

export function subscriptionSnapshotFromCustomerInfo(
  customerInfo: CustomerInfoShape,
): SubscriptionSnapshot {
  const knownEntitlement = customerInfo.entitlements.all[PREMIUM_ENTITLEMENT_ID];
  const activeEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  const hasActivePremium = activeEntitlement?.isActive === true;
  const isTrial = hasActivePremium && activeEntitlement.periodType.toUpperCase() === 'TRIAL';
  const status: SubscriptionStatus = hasActivePremium
    ? isTrial
      ? 'trialing'
      : 'premium'
    : knownEntitlement
      ? 'expired'
      : 'free';
  const displayedEntitlement = activeEntitlement ?? knownEntitlement;

  return {
    expirationDate: displayedEntitlement?.expirationDate ?? null,
    isPremium: hasActivePremium,
    isTrial,
    managementUrl: customerInfo.managementURL,
    productId: displayedEntitlement?.productIdentifier ?? null,
    status,
    willRenew: activeEntitlement?.willRenew ?? false,
  };
}
