# Gate 23 internationalization foundation

WebBookMaker UI language is managed by a small internal resource system in
`src/lib/localization.ts`. It keeps semantic keys grouped by domain (common,
navigation, pricing, contact, auth, dashboard, editor, reader, and legal) and
uses the typed `UiTranslationKey` union so arbitrary key strings cannot spread
through the application.

The supported UI locales are Japanese (`ja`) and English (`en`). A missing or
invalid key/locale safely falls back to Japanese. `scripts/verify-i18n.ts`
checks key parity and fallback behavior in CI/tests.

`UiLocaleProvider` persists only a non-sensitive UI preference in
`localStorage` and the `wbm-ui-locale` cookie. The priority is explicit user
selection, saved preference, browser preference, then Japanese. The root HTML
starts as `lang="ja"` for hydration safety and is updated to the selected UI
locale after the provider mounts. Routes and published book URLs are unchanged.

The selector is available in the public and authenticated shared navigation.
It is keyboard accessible, has an explicit accessible label, and uses the
existing design tokens/styles. It does not require login and does not modify a
book draft or create a dirty editor state.

Only WebBookMaker chrome is translated. User-authored book title, body,
chapter titles, author names, descriptions, uploaded content, and custom CTA
text remain untouched. Long-form brand articles and legal body text remain
Japanese-authoritative until a reviewed translation is prepared; their
navigation can still use the UI locale.

Pricing keeps the existing JPY source of truth and never performs currency
conversion. Email templates, Stripe/Connect, Supabase schema, Auth
architecture, and Resend flows are outside this foundation.
