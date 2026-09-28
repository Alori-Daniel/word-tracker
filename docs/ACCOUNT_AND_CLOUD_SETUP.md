# Vocabulary Vault account and cloud setup

The account and cloud foundation adds optional Google sign-in and cloud backup without changing the guest-first product philosophy. The app is still fully usable without an account. When a guest chooses Google sign-in, their existing local categories, words, attribution, and review history are attached to the account and merged into its cloud vault.

```text
Local guest vault
       |
       | user chooses Google sign-in
       v
Supabase Auth OAuth flow
       |
       | authenticated Supabase session
       v
Link local identity to the account
       |
       | one authenticated sync_vault RPC
       v
Postgres merge protected by Row Level Security
       |
       | canonical account snapshot
       v
Replace the matching local snapshot transactionally
```

## What is implemented

| Part                 | Location                                        | Responsibility                                                                                                           |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Account state        | `src/features/auth/account-provider.tsx`        | Restores sessions, links guest data, exposes sign-in/sign-out, schedules sync, and supplies the AI gateway access token. |
| Google OAuth         | `src/services/auth/supabase-google-auth.ts`     | Starts Supabase Google OAuth through Expo WebBrowser and exchanges the PKCE callback for a session.                      |
| Supabase client      | `src/services/supabase/`                        | Creates a lazy client only when valid public configuration exists and persists sessions with Expo SQLite local storage.  |
| Local migration      | `GuestIdentityRepository.linkAccount`           | Attaches local categories, words, and reviews to the authenticated account in one SQLite transaction.                    |
| Local sync boundary  | `VaultSyncRepository`                           | Exports an account snapshot and applies the cloud result only if the local vault did not change during the request.      |
| Cloud sync client    | `src/services/cloud/`                           | Calls the single `sync_vault` RPC, validates its result, and retries once after a concurrent local edit.                 |
| Cloud schema and RLS | `supabase/migrations/0001_vocabulary_vault.sql` | Creates account-owned tables, policies, natural-key merging, and the transactional sync function.                        |

Local mutations queue a sync after one second. Sign-in, app session restoration, and the **Sync now** button also trigger sync. If networking or cloud configuration fails, the local SQLite vault remains the working copy.

## Why sync uses one database function

Guest migration can involve categories, words, and review records with foreign-key relationships. Sending independent requests for every table could leave half-migrated data if the connection stops midway. `sync_vault` performs the merge inside one Postgres transaction and derives the owner from `auth.uid()` rather than trusting a user ID supplied by the app.

Categories are merged by normalized name and words by normalized spelling. When the same item exists on two devices, the newest `updated_at` value wins. IDs are mapped on the server so reviews and category references still point to the canonical cloud record.

The app snapshots SQLite before the request. Before applying the server result it verifies that the local snapshot is unchanged. If the user edited the vault during the network request, the app keeps that edit and retries with the newer snapshot.

## Supabase setup

### 1. Create a project

Create a Supabase project and copy these values from its **Connect** panel:

- Project URL
- Publishable key

The publishable key is intentionally used in the mobile app. It is not a server secret; access is constrained by the authenticated session and Row Level Security policies. Never put a service-role key in Expo configuration.

### 2. Apply the database migration

Use the Supabase CLI migration workflow or run [the included SQL migration](../supabase/migrations/0001_vocabulary_vault.sql) in the project SQL editor.

The migration creates:

- `profiles`
- `vault_categories`
- `vault_words`
- `vault_reviews`
- account-owned RLS policies
- the authenticated `sync_vault(jsonb)` function

The anonymous role receives no vault-table or sync-function access.

### 3. Configure Google in Supabase

In Google Auth Platform:

1. Create a Web OAuth client.
2. Configure the standard `openid`, email, and profile scopes.
3. Add the Supabase Google callback URL shown in **Authentication → Providers → Google** as a Google authorized redirect URI.
4. Add the Google client ID and secret to the Supabase Google provider settings.

In **Authentication → URL Configuration → Additional Redirect URLs**, add:

```text
vocabularyvault://auth/callback
```

Also add the exact HTTPS origin/callback used by the web build if web sign-in will be enabled. Development builds are recommended for testing the stable custom-scheme callback; do not rely on Expo Go callback URLs for production OAuth configuration.

### 4. Configure the Expo app

Copy `.env.example` to `.env.local` and set:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Restart Expo after changing environment values. When either value is absent or invalid, Google sign-in remains disabled and guest mode continues normally.

Because `expo-web-browser` adds native configuration, create a new development build after installing this stage:

```bash
npx eas-cli@latest build --profile development
```

## Account behavior

- Authentication is never forced during onboarding.
- First sign-in preserves and uploads existing guest data.
- Signing out does not delete the on-device vault.
- The local vault remembers which account owns it, so a different Google account cannot silently claim the previous account's data.
- A returning account on an empty device restores its cloud categories, words, and reviews.
- AI requests now receive the current Supabase access token, allowing the gateway to verify premium access later.

## Production checklist

- [ ] Google provider is enabled and its consent screen is branded.
- [ ] `vocabularyvault://auth/callback` is in the Supabase redirect allow list.
- [ ] The migration has run successfully in development and production projects.
- [ ] RLS is enabled on every vault table.
- [ ] Only the publishable key is present in Expo environment variables.
- [ ] Sign-in is tested in iOS and Android development builds.
- [ ] Guest words migrate without disappearing from the local library.
- [ ] A second clean device restores the same account vault.
- [ ] Offline edits stay local and sync after connectivity returns or **Sync now** is tapped.
- [ ] A different Google account is refused on an already-linked local vault.
