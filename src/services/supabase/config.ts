export type SupabasePublicConfig = {
  publishableKey: string;
  url: string;
};

function normalizeSupabaseUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    const isSecure = parsed.protocol === 'https:';
    const isLocal =
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(parsed.hostname);

    return isSecure || isLocal ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}
