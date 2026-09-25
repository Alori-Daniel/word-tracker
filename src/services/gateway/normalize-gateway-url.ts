export function normalizeGatewayBaseUrl(baseUrl?: string | null): string | null {
  const candidate = baseUrl?.trim();

  if (!candidate) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const isSecure = parsed.protocol === 'https:';
  const isLoopback =
    parsed.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(parsed.hostname);

  if (!isSecure && !isLoopback) {
    return null;
  }

  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
}
