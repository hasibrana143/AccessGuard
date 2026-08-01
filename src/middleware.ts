import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (!token && pathname.startsWith('/(dashboard)')) {
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
          '/api/auth',
          '/api/health',
          '/api/legal',
          '/api/docs',
          '/api/csrf-token',
          '/api/stripe/webhook',
        ];

        if (publicPaths.some(p => pathname.startsWith(p))) {
          return true;
        }

        if (pathname.startsWith('/api/')) {
          return !!token;
        }

        if (pathname.startsWith('/(dashboard)')) {
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
