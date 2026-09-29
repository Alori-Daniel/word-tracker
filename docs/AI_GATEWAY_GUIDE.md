# WordEcho dictionary and AI gateway guide

This document explains the Stage 6 lookup and AI architecture in plain language. The short version is: **the mobile app talks to our gateway; the gateway talks to dictionary and AI providers**.

```text
WordEcho app
        |
        v
WordEcho gateway
  |                         |
  | free dictionary lookup  | premium AI assistance
  | anonymous + rate limit  | account + plan + quota checks
  v                         v
Dictionary provider         OpenAI Responses API
  |                         |
  +----------+--------------+
             v
Gateway validates the result
             |
             v
App shows choices or a preview; the user decides what to apply
```

## What is the gateway?

A gateway is a small backend service that stands between the app and an external AI provider. Think of it as a secure receptionist:

1. The app asks the gateway to look up a word or generate an AI draft.
2. For a free lookup, the gateway applies anonymous rate limits and checks its cache.
3. For AI, it checks who is asking and whether their plan and quota allow usage.
4. The gateway calls the relevant provider and validates the response.
5. The app receives only the fields it understands—never provider secrets.

The gateway is necessary because an installed mobile app cannot keep a secret. Expo replaces every `EXPO_PUBLIC_*` value in the app bundle, so those values are visible to an end user. Expo explicitly warns not to put private keys there. The official OpenAI API reference also says API keys must not be exposed in client-side apps and should be loaded on a server. See the [Expo environment-variable guide](https://docs.expo.dev/guides/environment-variables/) and [OpenAI API authentication guidance](https://developers.openai.com/api/reference/overview#authentication).

## What Stage 6 now contains

| Part | Location | Responsibility |
| --- | --- | --- |
| Shared dictionary types | `src/domain/dictionary.ts` | Defines lookup meanings, attribution, metadata, selections, and known error types. |
| Mobile dictionary client | `src/services/dictionary/` | Calls the shared gateway, applies a timeout, maps safe errors, and rejects malformed responses. |
| Dictionary form workflow | `src/features/dictionary/` | Shows possible meanings and only fills fields after the user explicitly selects one. |
| Dictionary reference handler | `server/dictionary-gateway/` | Applies cache and anonymous rate-limit hooks, calls the replaceable provider, and normalizes its response. |
| Deployable dictionary function | `supabase/functions/wordecho-gateway/` | Implements the public Supabase route, private cache, salted anonymous rate limiting, and provider adapter. |
| Dictionary deployment guide | `docs/DICTIONARY_GATEWAY_DEPLOYMENT.md` | Gives the dashboard-only SQL, secret, deployment, and testing steps. |
| Shared AI types | `src/domain/ai.ts` | Defines the request, optional dictionary grounding, generated fields, metadata, and known errors. |
| Mobile gateway client | `src/services/ai/` | Calls only our gateway, attaches a future account token, applies a timeout, maps safe errors, and rejects malformed responses. |
| AI form workflow | `src/features/ai/` | Lets a user generate, preview, and explicitly apply suggestions. It never saves or overwrites fields automatically. |
| Server reference handler | `server/ai-gateway/word-assist-handler.ts` | Enforces authentication and authorization hooks, calls the OpenAI Responses API, and validates the structured result. |
| Configuration examples | `.env.example` and `server/ai-gateway/.env.example` | Clearly separate the public shared gateway URL from server-only secrets. |

The reference handler uses Structured Outputs through `text.format` so the model is asked to return the exact JSON shape WordEcho expects. The app and gateway still validate the result because network responses must always be treated as untrusted. This follows the current [OpenAI Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).

## What the user experiences

The quick-add card keeps only **Word** and **Meaning** required. After entering a word, the user can choose between two helpers:

- **Look up word — Free:** returns dictionary meanings. The user chooses the intended sense; the app never silently picks the first one. Datamuse currently prefills meaning, IPA pronunciation, and part of speech. The contract keeps example, synonym, and antonym fields optional for future providers.
- **Prefill with AI — Premium:** returns a learner-friendly draft for explicit review and application.

When a dictionary sense has been selected, that exact definition and part of speech are sent to AI as a factual anchor. AI can simplify or personalize it, but the gateway prompt tells it not to switch to or contradict another meaning.

Dictionary attribution is stored with the definition. It is deliberately separate from **Where did you find it?**, which remains the user's personal reading or conversation context. Manually rewriting the meaning or applying AI content clears the dictionary attribution so the app does not mislabel edited text as a verbatim provider definition.

The add and edit word forms now contain an optional **Prefill with AI** area.

- The user enters a word.
- They can optionally add an original sentence or an existing definition.
- They tap **Prefill word details**.
- The returned definition, simple definition, pronunciation, part of speech, examples, synonyms, antonyms, memory tip, and context explanation appear in a preview.
- They tap **Apply to form** only if they want the draft.
- They can edit every field before saving the word.

AI content is deliberately presented as a draft, with a reminder that it can be inaccurate.

## What is connected now—and what is not

The dictionary gateway is ready to deploy from the Supabase Dashboard without
the CLI. Follow `docs/DICTIONARY_GATEWAY_DEPLOYMENT.md`; the deployment itself
still has to be completed in the project's Supabase Dashboard. Premium AI remains
intentionally disabled until its account and billing controls are ready. It requires:

- a configured Supabase project so the implemented Google sign-in flow can issue an account token;
- a server-side subscription and quota check;
- an OpenAI project API key stored in the gateway's secret manager;
- a server-selected model that supports Structured Outputs.

Until `EXPO_PUBLIC_GATEWAY_URL` is configured, both helpers show a disabled state.
This repository now configures it for the WordEcho Supabase function and includes
the dictionary cache and rate limit. The URL starts working after you complete the
dashboard deployment. AI remains fail-closed: before account authentication is
connected, its handler returns “Sign in to use AI assistance.”

## Recommended production deployment

Supabase Edge Functions are the recommended host for this project because the broader architecture already calls for Google OAuth, cloud data, account migration, and subscription state. One platform can then verify the Supabase session token and read the user's plan before spending any AI credits.

The deployment adapter around the supplied reference handler should perform these steps:

1. Verify the Supabase JWT from the app's `Authorization` header.
2. Resolve the authenticated user without trusting a user ID sent in the body.
3. Read the server-owned subscription status.
4. Atomically reserve one request from the user's plan allowance.
5. Call the Stage 6 handler with the authenticated actor and authorization result.
6. Record the gateway request ID, outcome, token usage, and cost metadata without logging the word's private context.
7. Refund or reconcile the reserved request if the provider call fails, according to the billing policy.

The handler is framework-independent and uses standard `Request`, `Response`, and `fetch` APIs. The mobile AI client now receives the current Supabase access token. A small Supabase Edge Function wrapper still needs to verify that token and supply the authorization and quota callbacks before live AI is enabled.

## Configuration: public URL versus secret key

### In the Expo app

Copy the root example file to `.env.local` and set only the gateway URL:

```dotenv
EXPO_PUBLIC_GATEWAY_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/wordecho-gateway
```

This value is public. Its only job is to tell the app where our server lives. The older `EXPO_PUBLIC_AI_GATEWAY_URL` name is temporarily accepted for compatibility, but new environments should use the shared name.

### In the deployed gateway

Use the hosting provider's encrypted secret manager for:

```dotenv
OPENAI_API_KEY=your-server-only-project-key
OPENAI_MODEL=your-approved-structured-output-model
```

These values must never appear in:

- an `EXPO_PUBLIC_*` variable;
- `app.json` or source code;
- a committed `.env` file;
- client logs, analytics, or error messages.

The repository ignores real `.env` files and commits only blank/example configuration files.

## Dictionary API contract

The app sends `GET /v1/dictionary/lookup?word=ephemeral&locale=en`. The provider adapter uses the [Datamuse API](https://www.datamuse.com/api/) for definitions, parts of speech, and IPA pronunciation. Provider-specific fields never leak into the mobile contract, so the provider can be replaced later.

The gateway returns one or more meanings and their attribution:

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
  "meta": { "requestId": "gateway-request-id", "cached": false }
}
```

The dictionary handler requires two deployment hooks: `cache` and `checkRateLimit`. A production adapter should key anonymous limits by a privacy-preserving network/device strategy, apply a short burst limit, and use the included 24-hour cache TTL. Provider failures are converted into stable app errors.

## AI API contract

The app sends `POST /v1/word-assist` to the gateway:

```json
{
  "version": 1,
  "word": "ephemeral",
  "context": "The beauty of the sunset was ephemeral.",
  "dictionaryGrounding": {
    "definition": "Lasting for a short period of time.",
    "partOfSpeech": "adjective",
    "example": null,
    "sourceName": "Datamuse"
  },
  "existingDefinition": null,
  "locale": "en"
}
```

The gateway returns:

```json
{
  "data": {
    "word": "ephemeral",
    "pronunciation": "ih-FEM-er-uhl",
    "definition": "Lasting for a very short time.",
    "simpleDefinition": "Not lasting long.",
    "partOfSpeech": "adjective",
    "examples": ["The rainbow was ephemeral."],
    "synonyms": ["brief", "fleeting"],
    "antonyms": ["lasting"],
    "memoryTip": "Think of a mayfly's short life.",
    "contextExplanation": "The sunset's beauty disappeared quickly."
  },
  "meta": {
    "requestId": "gateway-request-id",
    "provider": "openai",
    "model": "server-selected-model",
    "remaining": 9
  }
}
```

The version number allows the contract to evolve later without silently breaking older installed apps.

## Error behavior

The mobile client converts gateway failures into stable product states:

| HTTP status | App meaning |
| --- | --- |
| `400` | The word or context is invalid. |
| `401` | The user needs to sign in. |
| `402` or `403` | The current plan does not include AI. |
| `429` | The user has reached a plan or rate limit. |
| `5xx` | The gateway or AI provider is temporarily unavailable. |

Provider error bodies are not forwarded to the app. Each gateway response includes a request ID so a failure can be investigated without exposing a secret or internal provider details. The gateway also sends an `X-Client-Request-Id` to OpenAI; the [OpenAI API overview](https://developers.openai.com/api/reference/overview#debugging-requests) recommends request-ID logging for production troubleshooting.

## Privacy and cost controls before launch

Before enabling the feature for real users:

- publish a privacy explanation that says word text and optional context are sent to the AI service;
- avoid sending email addresses, display names, local device IDs, or unrelated notes to the model;
- keep `store: false` unless the product intentionally adopts provider-side storage;
- set per-user plan quotas and short burst rate limits on the gateway;
- set project spend limits and alerts in the provider dashboard;
- keep separate provider projects/keys for development and production;
- use a server-selected model—never accept a model name from the app;
- pin or deliberately review model changes and run a small vocabulary quality test set;
- monitor latency, refusals, malformed outputs, token usage, and costs without logging private source sentences.

## Stage 6 review checklist

- [ ] Word and Meaning remain the only required fields in the quick-add flow.
- [ ] Dictionary lookup is clearly marked free and does not require sign-in.
- [ ] No dictionary meaning is applied until the user explicitly selects it.
- [ ] Definition attribution is visible and remains separate from personal source context.
- [ ] Editing the meaning clears stale provider attribution.
- [ ] A selected dictionary sense grounds subsequent AI assistance.
- [ ] The AI area is placed appropriately in both add and edit flows.
- [ ] Generated content is only applied after explicit user approval.
- [ ] Existing category, favourite status, learning status, source, and source sentence are preserved.
- [ ] An existing pronunciation or part of speech is not erased when AI returns no value.
- [ ] The app contains no OpenAI key or direct call to `api.openai.com`.
- [ ] The disabled pre-configuration message is understandable.
- [ ] The production gateway remains disabled until Google auth, premium checks, and quotas are connected.
