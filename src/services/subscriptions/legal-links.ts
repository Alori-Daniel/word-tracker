export type SubscriptionLegalLinks = {
  privacyUrl: string | null;
  termsUrl: string | null;
};

export function subscriptionLegalLinks(): SubscriptionLegalLinks {
  return {
    privacyUrl: publicHttpUrl(process.env.EXPO_PUBLIC_PRIVACY_URL),
    termsUrl: publicHttpUrl(process.env.EXPO_PUBLIC_TERMS_URL),
  };
}

function publicHttpUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
