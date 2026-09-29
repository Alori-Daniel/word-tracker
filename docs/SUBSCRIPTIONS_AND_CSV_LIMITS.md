# WordEcho subscriptions and CSV allowances

This document defines the approved freemium model and the server boundaries for
the payment implementation. Stage 1 adds only policy, types, and data storage;
it does not install a billing SDK or show a paywall.

## Product model

| Capability | Free | Premium |
| --- | --- | --- |
| Manual words, categories, and reviews | Unlimited | Unlimited |
| Dictionary lookup | Included | Included |
| Basic widgets | Included | Included |
| Account backup and device sync | Included | Included |
| CSV imports | Five for the lifetime of the account | Unlimited |
| CSV exports | Unlimited | Unlimited |
| Advanced widgets | Not included | Included |
| Advanced analytics | Not included | Included |
| Cloud history and restore | Not included | Included |

Exports stay free because users must be able to retrieve their vocabulary. A
CSV import consumes an allowance only after the file has passed validation and
the import is ready to commit. Selecting a file, previewing it, cancelling, or
retrying the same operation must not consume another allowance.

## Products and entitlement

- RevenueCat entitlement: `premium`
- Monthly product: `wordecho_premium_monthly`
- Annual product: `wordecho_premium_annual`
- Introductory trial: seven days
- Free CSV import allowance: five lifetime operations

Store price text must come from the billing SDK. It must never be hardcoded in
the app because currency, tax, storefront, and price can differ by user.

Apple and Google determine introductory-offer eligibility. The application must
not grant a trial from a local date or trust a client-provided subscription
status. The paywall must clearly display the trial length, renewal period, and
full price charged after the trial.

## Identity flow

WordEcho remains guest-first:

```text
Guest opens WordEcho
        |
        | RevenueCat creates an anonymous customer
        v
Guest may start Premium
        |
        | user later signs in with Google
        v
RevenueCat logIn(Supabase user UUID)
        |
        v
Anonymous purchase is associated with the account
```

The Supabase user UUID is the identified RevenueCat App User ID. Email addresses
must never be used as App User IDs. Webhook processing must resolve the current
App User ID, original App User ID, and aliases because an anonymous customer can
be merged into an authenticated customer.

## Authority and data flow

```text
App Store / Google Play
        |
        v
RevenueCat
   |             |
   | SDK state   | signed webhook
   v             v
Mobile UI     Supabase Edge Function
                    |
                    v
        billing_customers + webhook events
                    |
                    v
       profiles.subscription_status summary
```

The SDK can unlock the UI immediately after a successful purchase. Supabase is
the server authority for account-scoped premium services. A later webhook stage
will validate the webhook authorization header, store each event once, update
the billing customer, and derive `profiles.subscription_status`.

`profiles.subscription_status` intentionally remains a small effective-access
summary:

- `free`: no active Premium entitlement;
- `trialing`: Premium is active during the store trial;
- `premium`: paid access is active, including any permitted grace period;
- `expired`: the account previously had Premium but no longer has access.

The detailed provider lifecycle is stored separately in `billing_customers`.
Cancellation does not immediately remove access: a cancelled subscription
normally stays active through its current expiration date.

## CSV allowance accounting

The allowance uses immutable usage events rather than a client-editable counter.
Every import receives a UUID operation ID. Repeating that ID is idempotent and
cannot charge the allowance twice.

- Guests receive five imports for the lifetime of their current local vault and
  record usage in SQLite. Reinstalling before creating an account can reset this
  local-only allowance; secure cross-install enforcement requires sign-in.
- Linking a Google account attaches guest usage events to that account.
- Signed-in free accounts reserve an import atomically through
  `reserve_free_csv_import(operation_id)`.
- Trial and Premium accounts receive unlimited imports and do not consume the
  five free operations.
- Used free operations remain recorded after a trial or subscription expires.

The cloud tables have Row Level Security enabled and no direct mobile-client
table permissions. The authenticated app receives access only to the narrow
reservation function. Billing tables remain server-only.

## Added schema

`supabase/migrations/0003_subscriptions.sql` adds:

- `billing_customers`: current RevenueCat entitlement and store lifecycle;
- `billing_webhook_events`: idempotent webhook receipt and audit records;
- `feature_usage_events`: account-owned CSV import operations; and
- `reserve_free_csv_import(uuid)`: atomic free-allowance reservation.

Local database migration 3 adds `feature_usage_events` for guest-first usage and
future account migration.

## Next implementation stages

1. Install and configure the RevenueCat Expo SDK using public platform API keys.
2. Add the subscription provider and anonymous-to-Supabase identity transition.
3. Build the paywall, trial messaging, restore, and subscription-management UI.
4. Implement CSV validation, preview, import, export, and allowance reservation.
5. Deploy the authenticated RevenueCat webhook and synchronize server state.
6. Test sandbox purchases, restores, cancellation, expiration, billing issues,
   grace periods, account switching, and guest-to-account migration.

References:

- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat customer identity](https://www.revenuecat.com/docs/customers/identifying-customers)
- [RevenueCat webhook fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
- [Apple introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- [Google Play subscriptions](https://developer.android.com/google/play/billing/subscriptions)
