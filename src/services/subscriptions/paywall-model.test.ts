import type {
  IntroEligibility,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import {
  annualSavingsPercent,
  freeTrialLabel,
  isPurchaseCancellation,
  subscriptionPackagesFromOffering,
  trialEligibilityForPackage,
} from './paywall-model';

function subscriptionPackage(
  identifier: string,
  price: number,
  overrides: Record<string, unknown> = {},
): PurchasesPackage {
  return {
    identifier,
    product: {
      identifier,
      price,
      priceString: `$${price}`,
      introPrice: null,
      defaultOption: null,
      ...overrides,
    },
  } as unknown as PurchasesPackage;
}

describe('subscription paywall model', () => {
  it('finds plans by product ID when predefined packages are absent', () => {
    const annual = subscriptionPackage('wordecho_premium_annual', 39.99);
    const monthly = subscriptionPackage('wordecho_premium_monthly', 4.99);
    const offering = {
      annual: null,
      monthly: null,
      availablePackages: [monthly, annual],
    } as unknown as PurchasesOffering;

    expect(subscriptionPackagesFromOffering(offering)).toEqual({ annual, monthly });
  });

  it('calculates a positive annual saving against twelve monthly payments', () => {
    expect(
      annualSavingsPercent(
        subscriptionPackage('annual', 48),
        subscriptionPackage('monthly', 5),
      ),
    ).toBe(20);
  });

  it('only advertises an iOS trial when the store marks it eligible', () => {
    const item = subscriptionPackage('annual', 48, {
      introPrice: {
        cycles: 1,
        periodNumberOfUnits: 7,
        periodUnit: 'DAY',
        price: 0,
      },
    });
    const eligible = { status: 2, description: 'eligible' } as IntroEligibility;
    const unknown = { status: 0, description: 'unknown' } as IntroEligibility;

    expect(trialEligibilityForPackage(item, 'ios', eligible)).toBe('eligible');
    expect(trialEligibilityForPackage(item, 'ios', unknown)).toBe('unknown');
    expect(freeTrialLabel(item, 'ios')).toBe('7 days');
  });

  it('uses the eligible Google Play option to detect its free phase', () => {
    const item = subscriptionPackage('monthly', 5, {
      defaultOption: {
        freePhase: { billingPeriod: { iso8601: 'P1W', unit: 'WEEK', value: 1 } },
      },
    });

    expect(trialEligibilityForPackage(item, 'android')).toBe('eligible');
    expect(freeTrialLabel(item, 'android')).toBe('1 week');
  });

  it('recognizes user-cancelled purchase errors without hiding other errors', () => {
    expect(isPurchaseCancellation({ userCancelled: true })).toBe(true);
    expect(isPurchaseCancellation({ userCancelled: false })).toBe(false);
    expect(isPurchaseCancellation(new Error('offline'))).toBe(false);
  });
});
