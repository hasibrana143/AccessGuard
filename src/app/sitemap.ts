import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://accessguard.io';

// Auto-generated sitemap (docs/business/SEO.md §baseline).
// App routes, /share/[token] and /api/* are excluded intentionally.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority?: number; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/auth/login', priority: 0.3 },
    { path: '/auth/register', priority: 0.3 },
    { path: '/auth/forgot-password', priority: 0.1 },
  ];

  return routes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency ?? 'monthly',
    priority: r.priority ?? 0.5,
  }));
}
