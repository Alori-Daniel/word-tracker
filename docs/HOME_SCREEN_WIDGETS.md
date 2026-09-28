# Vocabulary Vault Home Screen widgets

Stage 7 adds a native Vocabulary Vault widget for both iOS and Android. Its purpose is to make saved words visible during the day and provide quick routes back into the vault.

## What the widget shows

The layout responds to the available widget size:

- the selected word and its meaning are always the visual focus;
- pronunciation and part of speech appear when available;
- a saved example appears in the large layout;
- the dark appearance uses the Vocabulary Vault blue palette;
- the empty state sends the user directly to **Add word**.

The actions are deliberately predictable:

| Action | Behaviour |
| --- | --- |
| **Add** | Opens the compact Add Word screen. |
| **Edit** | Opens the edit screen for the displayed word. |
| **Next** | Changes the displayed word directly on the widget. |
| **Review** | Opens the review session; it appears when the widget has enough room. |
| Tap the word | Opens that word's detail screen. |

Add and Edit do not mutate the vault from the Home Screen. They open the app so validation, dictionary lookup, and local/cloud synchronization continue to use the same trusted data path.

## Personalization

The app's **Settings → Home Screen widget** card controls:

- source: learning, recent, favourites, or a rotating surprise;
- category: all categories or one selected category;
- rotation: every 30 minutes, hourly, every three hours, or daily;
- appearance: system, light, or dark blue.

Preferences remain local and guest-friendly. Whenever words, categories, or widget preferences change, the app creates a bounded snapshot containing only the fields the widget needs. This avoids giving the native widget process direct access to the full vault database.

## Platform architecture

### iOS

`expo-widgets` supplies the WidgetKit target and renders the view from `src/widgets/vocabulary-vault-widget.ios.tsx`. The app publishes a timeline so iOS can rotate words even while the main app is closed. Interactive **Next** uses the iOS widget button API; links use the `vocabularyvault` app scheme.

Interactive widget buttons require iOS 17 or newer. The Add, Edit, Review, and word links remain regular widget links; iOS 16.4 users can still open those destinations and receive timeline-based word rotation.

iOS does not provide an app-facing API to open the widget picker or install a Home Screen widget. The user must add it from the Home Screen; the app provides those instructions in Settings. Widget gallery previews arrive before a vocabulary timeline exists, so the iOS view also includes a safe empty-state fallback for that first render.

### Android

`react-native-android-widget` supplies the Android widget receiver and RemoteViews renderer. `index.ts` registers the widget task before Expo Router starts. A separate SQLite key/value database stores the bounded widget snapshot for background updates and **Next** clicks.

Android periodic widget updates have a 30-minute platform minimum. The app also requests an immediate refresh after any relevant vault change. The Settings button asks supported Android launchers to pin the widget; if that API is unavailable, the app shows manual installation instructions.

## Native identifiers

The current prebuild configuration uses:

```text
iOS app:       com.danori.wordecho
iOS widget:    com.danori.wordecho.widgets
iOS app group: group.com.danori.wordecho
Android app:   com.danori.wordecho
```

These identifiers are required before native widget targets can be generated. If a different production identity is chosen, change all four together before registering store credentials or shipping a build.

## Running the widgets

Widgets contain native code and do not run in Expo Go. Create a development build after installing dependencies or changing widget configuration:

```bash
npx expo run:ios
npx expo run:android
```

EAS development builds are also supported. After installing the build, add **Vocabulary Vault** from the system widget picker. Android can also use the in-app pin button.

## Key files

| Location | Responsibility |
| --- | --- |
| `app.json` | Native IDs, iOS widget target, and Android receiver configuration. |
| `src/widgets/vocabulary-vault-widget.ios.tsx` | Responsive WidgetKit UI and interactive actions. |
| `src/widgets/vocabulary-vault-widget.android.tsx` | Responsive Android widget representation. |
| `src/widgets/register-widget-handler.android.tsx` | Android lifecycle, periodic update, and **Next** click handler. |
| `src/features/widgets/widget-sync-provider.tsx` | Publishes a fresh snapshot after vault changes. |
| `src/features/widgets/widget-settings-card.tsx` | User-facing widget preferences and Android pin action. |
| `src/services/widgets/` | Snapshot selection, validation, timeline generation, storage, and deep links. |
