import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://accessguard.io';

// robots.txt (docs/business/SEO.md §baseline): public marketing paths crawlable;
// app shell, share links, and API excluded.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing'],
        disallow: [
          '/dashboard',
          '/projects',
          '/scans',
          '/violations',
          '/reports',
          '/settings',
          '/team',
          '/admin',
          '/audit-logs',
          '/flags',
          '/share',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
