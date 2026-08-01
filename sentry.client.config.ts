import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enabled: !!dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.httpClientIntegration(),
      Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
    ],
  });
} else {
  const pino = await import('pino');
  const logger = pino.default({ level: 'info' });
  logger.warn('Sentry DSN not configured — Sentry disabled');
}
