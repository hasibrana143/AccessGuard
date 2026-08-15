import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { cookies, headers } from 'next/headers';
import { routing } from './routing';

/**
 * Resolve the active locale without URL-prefix middleware:
 * 1. `NEXT_LOCALE` cookie (set by the locale switcher)
 * 2. `Accept-Language` header (best match against supported locales)
 * 3. Default (`en`)
 */
function resolveLocale(requested: string | undefined): string {
  if (requested && hasLocale(routing.locales, requested)) return requested;
  return routing.defaultLocale;
}

function bestLocaleFromHeader(header: string | null): string | undefined {
  if (!header) return undefined;
  // Parse q-values, sort by preference, return first supported locale
  const prefs = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.startsWith('q='));
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q.slice(2)) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const pref of prefs) {
    const base = pref.tag.split('-')[0];
    const hit = routing.locales.find((l) => l === base);
    if (hit) return hit;
  }
  return undefined;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const cookieStore = await cookies();
  const headerStore = await headers();
  const fromCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const fromHeader = bestLocaleFromHeader(headerStore.get('accept-language'));
  const locale = resolveLocale(requested ?? fromCookie ?? fromHeader);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
