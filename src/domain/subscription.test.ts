import {
  CSV_EXPORTS_ARE_UNLIMITED,
  FREE_CSV_IMPORT_LIMIT,
  getCsvImportAllowance,
  hasPremiumAccess,
  PREMIUM_TRIAL_DAYS,
  SUBSCRIPTION_PRODUCT_IDS,
} from './subscription';

describe('subscription policy', () => {
  it('defines the approved products and trial duration', () => {
    expect(PREMIUM_TRIAL_DAYS).toBe(7);
    expect(SUBSCRIPTION_PRODUCT_IDS).toEqual({
      monthly: 'wordecho_premium_monthly',
      annual: 'wordecho_premium_annual',
    });
  });

  it('gives free accounts five lifetime CSV imports', () => {
    expect(FREE_CSV_IMPORT_LIMIT).toBe(5);
    expect(getCsvImportAllowance('free', 4)).toEqual({
      allowed: true,
      limit: 5,
      reason: 'free_allowance',
      remaining: 1,
      used: 4,
    });
    expect(getCsvImportAllowance('expired', 5)).toEqual({
      allowed: false,
      limit: 5,
      reason: 'limit_reached',
      remaining: 0,
      used: 5,
    });
    expect(getCsvImportAllowance('free', Number.NaN).used).toBe(0);
  });

  it('allows unlimited imports during a trial or paid entitlement', () => {
    expect(hasPremiumAccess('trialing')).toBe(true);
    expect(hasPremiumAccess('premium')).toBe(true);
    expect(getCsvImportAllowance('trialing', 5)).toMatchObject({
      allowed: true,
      limit: null,
      reason: 'premium',
      remaining: null,
    });
  });

  it('keeps CSV export available to everyone', () => {
    expect(CSV_EXPORTS_ARE_UNLIMITED).toBe(true);
  });
});
