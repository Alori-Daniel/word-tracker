# Dictionary Gateway Deployment (Supabase Dashboard)

WordEcho's free **Look up word** action uses a public Supabase Edge Function. You do
not need to install or run the Supabase CLI for this setup.

The mobile app receives only the public function URL. Supabase injects the
server-side database credentials into the function; never copy a secret key or
service-role key into `.env.local` or any `EXPO_PUBLIC_*` variable.

## What is already prepared in this repository

- `supabase/migrations/0002_dictionary_gateway.sql` creates the private cache,
  private rate-limit table, and atomic rate-limit function.
- `supabase/functions/wordecho-gateway/index.ts` is the complete Edge Function.
- `.env.local` points the app at the final function URL for this Supabase project.

## 1. Create the database objects

1. Open the WordEcho project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select **SQL Editor** in the left sidebar.
3. Select **New query**.
4. Copy all of `supabase/migrations/0002_dictionary_gateway.sql` from this repository.
5. Paste it into the editor and select **Run**.
6. Confirm that the result says **Success. No rows returned**.

The two new tables intentionally have Row Level Security enabled and no client
policies. Guests and signed-in users cannot read them directly; only the Edge
Function's server-side client can access them.

## 2. Add the rate-limit salt

1. In Supabase, open **Edge Functions** and then **Secrets**.
2. Add a secret named exactly `DICTIONARY_RATE_LIMIT_SALT`.
3. Use a password-manager-generated random value of at least 32 characters
   (48-64 characters is a good choice).
4. Save the secret.

This value is used only to hash network identifiers before they are stored. Do
not add it to the Expo environment file or commit it to Git.

## 3. Create and deploy the function

1. Open **Edge Functions**.
2. Select **Deploy a new function** and then **Via Editor**.
3. Name it exactly `wordecho-gateway`.
4. Replace the generated code with all of
   `supabase/functions/wordecho-gateway/index.ts` from this repository.
5. Turn **Verify JWT** off for this function. Guest users have no session token,
   so the lookup endpoint must allow anonymous requests. The function protects
   itself with validation and rate limiting.
6. Select **Deploy function**.

The function's base URL is:

```text
https://hdarnpeaghqtxqkwstpm.supabase.co/functions/v1/wordecho-gateway
```

## 4. Test the deployed route

Open this URL in a browser:

```text
https://hdarnpeaghqtxqkwstpm.supabase.co/functions/v1/wordecho-gateway/v1/dictionary/lookup?word=ephemeral&locale=en
```

The first successful response should contain a dictionary entry and:

```json
"meta": { "cached": false }
```

Open it again. The second response should normally contain:

```json
"meta": { "cached": true }
```

If the response says `gateway_not_configured`, check that the secret name is
spelled exactly as shown above. If it says `gateway_unavailable`, confirm that
the SQL migration ran successfully, then inspect the function's **Logs** tab.

## 5. Restart Expo

After the function is deployed, stop the Metro server and restart it so Expo
reloads `.env.local`:

```bash
npx expo start --clear
```

No iOS or Android rebuild is needed because this change adds no native module.

## Operational defaults

- English lookups only
- 30 lookups per minute per salted client identifier
- Successful results cached for 24 hours
- Six-second provider deadline; the mobile client allows 12 seconds
- Raw IP addresses are not stored
- Dictionary data comes from the
  [Datamuse API](https://www.datamuse.com/api/)

Datamuse currently permits up to 100,000 requests per day without an API key,
but its published no-key allowance runs only until January 1, 2027. Review its
key requirements before that date. Public apps should acknowledge Datamuse in
their documentation; WordEcho also returns Datamuse attribution with each entry.

For a production release, review Supabase Edge Function usage and logs, and add
monitoring before raising the rate limit.

## Later CLI workflow (optional)

Keeping the SQL and function source in the repository makes a later CLI move
straightforward. At that point, initialize/link the project, configure this
function with `verify_jwt = false`, then deploy the migration and function from
source control. None of that is required for the dashboard setup above.
