import { Platform } from 'react-native';

type RevenueCatPublicKeys = {
  android?: string;
  ios?: string;
};

const publicKeys: RevenueCatPublicKeys = {
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
};

function validPublicKey(value: string | undefined): string | null {
  const key = value?.trim();

  if (!key || /YOUR_|your-|your_/i.test(key)) {
    return null;
  }

  return key;
}

export function revenueCatApiKeyForPlatform(
  platform = Platform.OS,
  keys: RevenueCatPublicKeys = publicKeys,
): string | null {
  if (platform === 'ios') return validPublicKey(keys.ios);
  if (platform === 'android') return validPublicKey(keys.android);
  return null;
}
