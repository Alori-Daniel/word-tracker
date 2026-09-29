import type {
  IntroEligibility,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import { SUBSCRIPTION_PRODUCT_IDS } from '@/domain/subscription';

export type TrialEligibility = 'eligible' | 'ineligible' | 'none' | 'unknown';
export type TrialEligibilityByProduct = Record<string, TrialEligibility>;

export type SubscriptionPackages = {
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
};

export function subscriptionPackagesFromOffering(
  offering: PurchasesOffering | null,
): SubscriptionPackages {
  if (!offering) return { annual: null, monthly: null };

  return {
    annual:
      offering.annual ??
      offering.availablePackages.find(
        (item) => item.product.identifier === SUBSCRIPTION_PRODUCT_IDS.annual,
      ) ??
      null,
    monthly:
      offering.monthly ??
      offering.availablePackages.find(
        (item) => item.product.identifier === SUBSCRIPTION_PRODUCT_IDS.monthly,
      ) ??
      null,
  };
}

export function trialEligibilityForPackage(
  item: PurchasesPackage,
  platform: 'android' | 'ios' | 'other',
  iosEligibility?: IntroEligibility,
): TrialEligibility {
  if (platform === 'android') {
    return item.product.defaultOption?.freePhase ? 'eligible' : 'none';
  }

  const hasFreeIntroductoryPrice = item.product.introPrice?.price === 0;
  if (!hasFreeIntroductoryPrice) return 'none';
  if (platform !== 'ios' || !iosEligibility) return 'unknown';

  switch (iosEligibility.status) {
    case 1:
      return 'ineligible';
    case 2:
      return 'eligible';
    case 3:
      return 'none';
    default:
      return 'unknown';
  }
}

export function freeTrialLabel(
  item: PurchasesPackage,
  platform: 'android' | 'ios' | 'other',
): string | null {
  if (platform === 'android') {
    const period = item.product.defaultOption?.freePhase?.billingPeriod;
    return period ? humanizePeriod(period.unit, period.value) : null;
  }

  const intro = item.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  return humanizePeriod(intro.periodUnit, intro.periodNumberOfUnits * intro.cycles);
}

export function annualSavingsPercent(
  annual: PurchasesPackage | null,
  monthly: PurchasesPackage | null,
): number | null {
  if (!annual || !monthly || annual.product.price <= 0 || monthly.product.price <= 0) {
    return null;
  }

  const percentage = Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);
  return percentage > 0 ? percentage : null;
}

export function isPurchaseCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'userCancelled' in error &&
    error.userCancelled === true
  );
}

function humanizePeriod(unit: string, value: number): string {
  const normalizedUnit = unit.toLowerCase();
  const displayUnit = value === 1 ? normalizedUnit : `${normalizedUnit}s`;
  return `${value} ${displayUnit}`;
}
