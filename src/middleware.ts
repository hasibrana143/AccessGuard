import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// NOTE (decision, Sept 2026): Next 16.3 deprecates the `middleware` file
// convention in favor of `proxy.ts`. Migration is DEFERRED, not skipped:
//  1. `npx @next/codemod@canary middleware-to-proxy` is a no-op here (0 files
//     changed — it does not handle the next-auth `withAuth` wrapper shape).
//  2. Next's own codemod source warns the rename can break next-intl
//     ("Couldn't find next-intl config file") without a proxy-compatible
//     next-intl version; this repo runs next-intl 4.13 + next-auth v4.
//  3. `middleware.ts` still fully works in 16.3 (build + e2e smoke green).
// TRIGGER to migrate: Next removes middleware support, or next-auth/next-intl
// document proxy-convention compatibility. Then re-run the codemod and
// re-verify with `npx playwright test smoke` (login redirect is the canary).

const DASHBOARD_PATHS = [
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
];

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (!token && isDashboardPath(pathname)) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const publicPaths = [
          '/',
          '/pricing',
          '/auth/login',
          '/auth/register',
          '/auth/forgot-password',
          '/api/auth',
          '/api/health',
          '/api/legal',
          '/api/docs',
          '/api/csrf-token',
          '/api/stripe/webhook',
          '/api/github/webhook',
          '/share',
          '/api/reports/share',
        ];

        if (publicPaths.some((p) => pathname.startsWith(p))) {
          return true;
        }

        if (pathname.startsWith('/api/')) {
          if (token) return true;
          const authHeader = req.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Bearer ')) return true;
          if (
            pathname === '/api/schedule/process' &&
            req.headers.get('x-scheduler-api-key')
          ) {
            return true;
          }
          return false;
        }

        if (isDashboardPath(pathname)) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo.svg|manifest.json|robots.txt|sitemap.xml).*)',
  ],
};
