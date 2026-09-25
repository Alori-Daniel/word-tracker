# Vocabulary Vault AI gateway guide

This document explains the Stage 6 AI architecture in plain language. The short version is: **the mobile app talks to our gateway, and only the gateway talks to OpenAI**.

```text
Vocabulary Vault app
        |
        | word + optional context + account token
        v
Vocabulary Vault AI gateway
  - verifies the user
  - checks premium access
  - checks the usage limit
  - holds the secret OpenAI key
        |
        | secure server-to-server request
        v
OpenAI Responses API
        |
        | structured vocabulary draft
        v
Gateway validates the result
        |
        v
App previews it; the user decides whether to apply it
```

## What is a gateway?

A gateway is a small backend service that stands between the app and an external AI provider. Think of it as a secure receptionist:

1. The app asks the gateway for help with a word.
2. The gateway checks who is asking and whether their plan allows AI usage.
3. The gateway calls OpenAI with its private API key.
4. It validates the answer and returns only the fields the app understands.

The gateway is necessary because an installed mobile app cannot keep a secret. Expo replaces every `EXPO_PUBLIC_*` value in the app bundle, so those values are visible to an end user. Expo explicitly warns not to put private keys there. The official OpenAI API reference also says API keys must not be exposed in client-side apps and should be loaded on a server. See the [Expo environment-variable guide](https://docs.expo.dev/guides/environment-variables/) and [OpenAI API authentication guidance](https://developers.openai.com/api/reference/overview#authentication).

## What Stage 6 now contains

| Part | Location | Responsibility |
| --- | --- | --- |
| Shared AI types | `src/domain/ai.ts` | Defines the request, generated vocabulary fields, metadata, and known error types. |
| Mobile gateway client | `src/services/ai/` | Calls only our gateway, attaches a future account token, applies a timeout, maps safe errors, and rejects malformed responses. |
| AI form workflow | `src/features/ai/` | Lets a user generate, preview, and explicitly apply suggestions. It never saves or overwrites fields automatically. |
| Server reference handler | `server/ai-gateway/word-assist-handler.ts` | Enforces authentication and authorization hooks, calls the OpenAI Responses API, and validates the structured result. |
| Configuration examples | `.env.example` and `server/ai-gateway/.env.example` | Clearly separate the public gateway URL from server-only secrets. |

The reference handler uses Structured Outputs through `text.format` so the model is asked to return the exact JSON shape Vocabulary Vault expects. The app and gateway still validate the result because network responses must always be treated as untrusted. This follows the current [OpenAI Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).

## What the user experiences

The add and edit word forms now contain an optional **Prefill with AI** area.

- The user enters a word.
- They can optionally add an original sentence or an existing definition.
- They tap **Prefill word details**.
- The returned definition, simple definition, pronunciation, part of speech, examples, synonyms, antonyms, memory tip, and context explanation appear in a preview.
- They tap **Apply to form** only if they want the draft.
- They can edit every field before saving the word.

AI content is deliberately presented as a draft, with a reminder that it can be inaccurate.

## What is connected now—and what is not

The code boundary is implemented and testable, but no live AI provider is connected yet. A live connection requires infrastructure and credentials that should not be guessed or committed to this repository:

- a deployed HTTPS gateway URL;
- Google sign-in issuing an account token;
- a server-side subscription and quota check;
- an OpenAI project API key stored in the gateway's secret manager;
- a server-selected model that supports Structured Outputs.

Until `EXPO_PUBLIC_AI_GATEWAY_URL` is configured, the app shows the AI control in a disabled state. After a gateway is configured but before account authentication is connected, the fail-closed handler returns “Sign in to use AI assistance.” This is intentional: premium AI must not become anonymous or unlimited by accident.

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

The handler is framework-independent and uses standard `Request`, `Response`, and `fetch` APIs. A small Supabase Edge Function wrapper can supply the authentication and quota callbacks. That wrapper should be implemented alongside the account/cloud stage so it uses the real database schema and access policies instead of temporary security logic.

## Configuration: public URL versus secret key

### In the Expo app

Copy the root example file to `.env.local` and set only the gateway URL:

```dotenv
EXPO_PUBLIC_AI_GATEWAY_URL=https://your-gateway.example.com
```

This value is public. Its only job is to tell the app where our server lives.

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

## API contract

The app sends `POST /v1/word-assist` to the gateway:

```json
{
  "version": 1,
  "word": "ephemeral",
  "context": "The beauty of the sunset was ephemeral.",
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

- [ ] The AI area is placed appropriately in both add and edit flows.
- [ ] Generated content is only applied after explicit user approval.
- [ ] Existing category, favourite status, learning status, source, and source sentence are preserved.
- [ ] An existing pronunciation or part of speech is not erased when AI returns no value.
- [ ] The app contains no OpenAI key or direct call to `api.openai.com`.
- [ ] The disabled pre-configuration message is understandable.
- [ ] The production gateway remains disabled until Google auth, premium checks, and quotas are connected.
