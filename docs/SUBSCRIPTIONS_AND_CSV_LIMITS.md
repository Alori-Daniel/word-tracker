# WordEcho subscriptions and CSV allowances

This document defines the approved freemium model, billing integration, and
server boundaries. The RevenueCat SDK, subscription state provider, and custom
WordEcho paywall are now connected.

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

## Mobile SDK integration

The app uses `react-native-purchases` and configures it once near the root of
the provider tree. The subscription provider:

- starts with an anonymous RevenueCat customer for guest mode;
- calls `Purchases.logIn` with the Supabase user UUID after Google sign-in;
- returns to a new anonymous customer after account sign-out;
- listens for CustomerInfo changes from purchases, renewals, and restores;
- maps the `premium` entitlement into WordEcho's free, trialing, Premium, or
  expired access states; and
- stays safely disabled when the current platform key is missing.

Configuration uses only public, platform-specific SDK keys:

```dotenv
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_sdk_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_public_sdk_key
EXPO_PUBLIC_TERMS_URL=https://your-domain.example/terms
EXPO_PUBLIC_PRIVACY_URL=https://your-domain.example/privacy
```

These keys identify the RevenueCat app and are expected in a mobile bundle. A
RevenueCat secret key must never use an `EXPO_PUBLIC_*` variable.

## RevenueCat dashboard preparation

Before the paywall stage:

1. Create one RevenueCat project for WordEcho.
2. Add an Apple app with bundle ID `com.danori.wordecho`.
3. Add a Google Play app with package name `com.danori.wordecho`.
4. Create the `premium` entitlement.
5. Create or import `wordecho_premium_monthly` and
   `wordecho_premium_annual` from their respective stores.
6. Attach both products to `premium` and add monthly and annual packages to the
   default offering.
7. Copy each app's public SDK key into `.env.local` using the variable names
   above, then restart Metro.

Store products must exist in App Store Connect and Google Play Console before
real product details or purchases can load. The seven-day introductory offer is
configured on those store products rather than granted by JavaScript.

## Paywall and purchase controls

Settings now links to a custom WordEcho Premium screen. It loads localized
monthly and annual prices from the current RevenueCat offering and supports:

- monthly and annual plan selection;
- an annual savings comparison when the annual store price is lower;
- a purchase through the native App Store or Google Play sheet;
- user-initiated purchase restoration;
- immediate entitlement refresh after purchase or restoration; and
- the store-provided subscription-management page for active subscribers.

Trial messaging is derived from store metadata and eligibility. On iOS the app
uses RevenueCat's introductory-offer eligibility result. On Android it checks
the eligible Google Play subscription option for a free pricing phase. If the
app cannot prove eligibility, it displays the full recurring price and does not
promise a free trial. The store purchase sheet remains the final authority.

The Terms of Use and Privacy Policy variables must point to real public pages
before store submission. The paywall deliberately reports missing links in
development instead of shipping placeholder destinations.

`react-native-purchases` contains native code. Expo Go can preview parts of the
integration, but real transactions require a new development build:

```bash
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

No manual `ios/` or `android/` edits are required; Expo's generated native
projects autolink the SDK during the build.

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

1. Implement CSV validation, preview, import, export, and allowance reservation.
2. Deploy the authenticated RevenueCat webhook and synchronize server state.
3. Test sandbox purchases, restores, cancellation, expiration, billing issues,
   grace periods, account switching, and guest-to-account migration.

References:

- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat customer identity](https://www.revenuecat.com/docs/customers/identifying-customers)
- [RevenueCat webhook fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
- [Apple introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- [Google Play subscriptions](https://developer.android.com/google/play/billing/subscriptions)
