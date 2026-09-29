import { revenueCatApiKeyForPlatform } from './revenuecat-config';

const keys = {
  android: 'goog_public_key',
  ios: 'appl_public_key',
};

describe('RevenueCat configuration', () => {
  it('selects the public key for the active native store', () => {
    expect(revenueCatApiKeyForPlatform('ios', keys)).toBe('appl_public_key');
    expect(revenueCatApiKeyForPlatform('android', keys)).toBe('goog_public_key');
  });

  it('does not configure unsupported platforms or placeholder keys', () => {
    expect(revenueCatApiKeyForPlatform('web', keys)).toBeNull();
    expect(
      revenueCatApiKeyForPlatform('ios', { ...keys, ios: 'YOUR_IOS_PUBLIC_SDK_KEY' }),
    ).toBeNull();
  });
});
