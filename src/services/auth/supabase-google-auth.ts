import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { AccountProfile } from '@/domain/account';

WebBrowser.maybeCompleteAuthSession();

export class AccountAuthError extends Error {
  constructor(message = 'Google sign-in could not be completed. Please try again.') {
    super(message);
    this.name = 'AccountAuthError';
  }
}

type OAuthCallback =
  | { type: 'code'; code: string }
  | { type: 'tokens'; accessToken: string; refreshToken: string };

export function parseOAuthCallback(url: string): OAuthCallback {
  const parsed = new URL(url);
  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const error = query.get('error_description') ?? fragment.get('error_description');

  if (error) throw new AccountAuthError(error);

  const code = query.get('code') ?? fragment.get('code');
  if (code) return { type: 'code', code };

  const accessToken = query.get('access_token') ?? fragment.get('access_token');
  const refreshToken = query.get('refresh_token') ?? fragment.get('refresh_token');

  if (accessToken && refreshToken) {
    return { type: 'tokens', accessToken, refreshToken };
  }

  throw new AccountAuthError('Google sign-in returned an incomplete session.');
}

export function accountProfileFromSession(session: Session): AccountProfile {
  const { user } = session;
  const email = user.email?.normalize('NFKC').trim();

  if (!email) {
    throw new AccountAuthError('Your Google account did not provide an email address.');
  }

  const displayNameValue = user.user_metadata.full_name ?? user.user_metadata.name;
  const avatarValue = user.user_metadata.avatar_url ?? user.user_metadata.picture;

  return {
    userId: user.id,
    email,
    displayName:
      typeof displayNameValue === 'string' && displayNameValue.trim()
        ? displayNameValue.normalize('NFKC').trim()
        : null,
    avatarUrl:
      typeof avatarValue === 'string' && avatarValue.trim() ? avatarValue.trim() : null,
    provider: 'google',
    subscriptionStatus: 'free',
  };
}

export class SupabaseGoogleAuth {
  constructor(private readonly client: SupabaseClient) {}

  getSession() {
    return this.client.auth.getSession();
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    return this.client.auth.onAuthStateChange((_event, session) => callback(session));
  }

  async signIn(): Promise<Session | null> {
    const redirectTo = makeRedirectUri({
      path: 'auth/callback',
      scheme: 'vocabularyvault',
    });
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error || !data.url) throw new AccountAuthError();

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return null;

    const callback = parseOAuthCallback(result.url);
    const sessionResult =
      callback.type === 'code'
        ? await this.client.auth.exchangeCodeForSession(callback.code)
        : await this.client.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });

    if (sessionResult.error || !sessionResult.data.session) {
      throw new AccountAuthError();
    }

    return sessionResult.data.session;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new AccountAuthError('Sign out could not be completed.');
  }
}
