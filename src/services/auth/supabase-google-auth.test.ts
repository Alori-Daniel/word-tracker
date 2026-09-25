import type { Session } from '@supabase/supabase-js';

import { accountProfileFromSession, parseOAuthCallback } from './supabase-google-auth';

describe('Supabase Google OAuth helpers', () => {
  it('parses a PKCE authorization code callback', () => {
    expect(parseOAuthCallback('vocabularyvault://auth/callback?code=code-123')).toEqual({
      type: 'code',
      code: 'code-123',
    });
  });

  it('supports an implicit token callback as a compatibility fallback', () => {
    expect(
      parseOAuthCallback(
        'vocabularyvault://auth/callback#access_token=access-1&refresh_token=refresh-1',
      ),
    ).toEqual({
      type: 'tokens',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
  });

  it('maps only the account fields the app needs', () => {
    const session = {
      user: {
        id: 'user-1',
        email: 'person@example.com',
        user_metadata: {
          full_name: '  Ada Reader  ',
          avatar_url: 'https://example.com/avatar.png',
        },
      },
    } as unknown as Session;

    expect(accountProfileFromSession(session)).toEqual({
      userId: 'user-1',
      email: 'person@example.com',
      displayName: 'Ada Reader',
      avatarUrl: 'https://example.com/avatar.png',
      provider: 'google',
      subscriptionStatus: 'free',
    });
  });
});
