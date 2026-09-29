# WordEcho dictionary gateway guide

WordEcho's **Look up word** action uses a dictionary-only gateway. The mobile app
calls the WordEcho Supabase Edge Function, and the function calls Datamuse.

```text
WordEcho app
      |
      | GET /v1/dictionary/lookup
      v
WordEcho gateway
      |
      | validation, anonymous rate limit, and cache
      v
Datamuse
      |
      v
Normalized dictionary result
      |
      v
The user chooses which meaning to apply
```

## Why keep a gateway?

Datamuse does not currently require a provider key, but the gateway still gives
WordEcho a stable boundary that can:

- validate lookup requests;
- enforce anonymous rate limits;
- cache successful responses for faster repeated lookups;
- convert provider-specific data into WordEcho's own response shape;
- return safe, consistent errors; and
- allow the dictionary provider to change without updating every installed app.

The app contains only the public gateway URL. Database credentials and the
rate-limit salt remain inside Supabase.

## Code map

| Part | Location | Responsibility |
| --- | --- | --- |
| Shared dictionary types | `src/domain/dictionary.ts` | Defines lookups, senses, attribution, selections, and error codes. |
| Mobile dictionary client | `src/services/dictionary/` | Validates input, calls the gateway, enforces a timeout, and parses responses. |
| Lookup UI | `src/features/dictionary/` | Displays meanings and applies only the sense the user selects. |
| Framework-independent handler | `server/dictionary-gateway/` | Normalizes requests, caching, rate limiting, and Datamuse responses. |
| Deployable function | `supabase/functions/wordecho-gateway/` | Connects the handler to Supabase storage and request metadata. |
| Database migration | `supabase/migrations/0002_dictionary_gateway.sql` | Creates the private cache and rate-limit infrastructure. |
| Deployment instructions | `docs/DICTIONARY_GATEWAY_DEPLOYMENT.md` | Explains dashboard setup, secrets, deployment, and smoke testing. |

## User experience

The quick-add form keeps **Word** and **Meaning** as the only required fields.
After entering a word, the user can run the free lookup and select the intended
sense. WordEcho then prefills the available definition, pronunciation, part of
speech, example, synonyms, and antonyms.

No result is applied automatically. This matters when a word has several
meanings: the person saving the word remains in control of the intended sense.

Provider attribution is saved with a selected definition. It is separate from
**Where did you find it?**, which records the user's book, article, or
conversation. Editing the definition manually clears its provider attribution
so WordEcho does not present edited text as a provider quotation.

## App configuration

Set the public function URL in `.env.local`:

```dotenv
EXPO_PUBLIC_GATEWAY_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/wordecho-gateway
```

Restart Metro after changing it:

```bash
npx expo start --clear
```

The URL is public by design. Do not place the Supabase service-role key,
`DICTIONARY_RATE_LIMIT_SALT`, or any other server secret in an
`EXPO_PUBLIC_*` variable.

## Request and response contract

The app requests:

```http
GET /v1/dictionary/lookup?word=ephemeral&locale=en
```

The gateway returns a normalized result:

```json
{
  "data": {
    "word": "ephemeral",
    "pronunciation": "/ɪfˈɛmɝʌɫ/",
    "audioUrl": null,
    "senses": [
      {
        "id": "0-0-0",
        "definition": "Lasting for a short period of time.",
        "partOfSpeech": "adjective",
        "example": null,
        "synonyms": [],
        "antonyms": []
      }
    ],
    "attribution": {
      "providerName": "Datamuse",
      "providerUrl": "https://www.datamuse.com/api/",
      "sourceUrl": null,
      "licenseName": null,
      "licenseUrl": null
    }
  },
  "meta": {
    "requestId": "gateway-request-id",
    "cached": false
  }
}
```

The current route supports English words only. Successful results are cached
for 24 hours, and the deployed function allows 30 lookups per minute for each
salted client identifier.

## Error behavior

| Status | Meaning in the app |
| --- | --- |
| `400` | The word is invalid or the locale is unsupported. |
| `404` | No dictionary entry was found. |
| `429` | The anonymous lookup limit was reached. |
| `5xx` | The gateway or dictionary provider is temporarily unavailable. |

Each gateway response has a request ID for troubleshooting. Provider error
bodies are not forwarded to the app, and raw network identifiers are not stored
by the included rate limiter.

## Release checklist

- [ ] The Supabase migration has been applied.
- [ ] `DICTIONARY_RATE_LIMIT_SALT` exists only in Edge Function secrets.
- [ ] JWT verification is disabled for this guest-accessible function.
- [ ] The public function URL is configured in the Expo environment.
- [ ] Lookup works for both guest and signed-in users.
- [ ] The user must select a meaning before any fields are changed.
- [ ] Attribution appears for a selected provider definition.
- [ ] Editing the meaning clears stale attribution.
- [ ] Cache hits, not-found responses, rate limiting, and provider failures are tested.
- [ ] Datamuse usage terms and published request allowance are reviewed before release.

For the exact Supabase Dashboard procedure, continue with
`docs/DICTIONARY_GATEWAY_DEPLOYMENT.md`.
