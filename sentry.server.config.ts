import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 1.0,
    profilesSampleRate: 0.2,
    enabled: !!dsn,
    integrations: [
      Sentry.prismaIntegration(),
      Sentry.httpIntegration(),
    ],
  });
}
