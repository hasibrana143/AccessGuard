import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

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
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|manifest.json|robots.txt|sitemap.xml).*)',
  ],
};
