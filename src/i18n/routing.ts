import { defineRouting } from 'next-intl/routing';

/**
 * Locale configuration.
 *
 * Uses `localePrefix: 'never'` — URLs stay unprefixed (existing routes,
 * middleware, and e2e tests are untouched). Locale is detected via the
 * `NEXT_LOCALE` cookie, falling back to the Accept-Language header, then `en`.
 */
export const routing = defineRouting({
  locales: ['en', 'hi'],
  defaultLocale: 'en',
  localePrefix: 'never',
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
