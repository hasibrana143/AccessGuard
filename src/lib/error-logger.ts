import pino from 'pino';

const isServer = typeof window === 'undefined';

let AsyncLocalStorageClass: { new <T>(): { getStore(): T | undefined; run(store: T, fn: () => void): void } } | undefined;

if (isServer) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const asyncHooks = require('node:async_hooks');
    AsyncLocalStorageClass = asyncHooks.AsyncLocalStorage;
  } catch {
    AsyncLocalStorageClass = undefined;
  }
}

export const correlationIdStorage = AsyncLocalStorageClass
  ? new AsyncLocalStorageClass<string>()
  : undefined;

export const logger = pino({
  level: isServer ? (process.env.LOG_LEVEL || 'info') : 'silent',
  // No pino-pretty transport: the worker thread it spawns crashes Next
  // standalone/serverless builds. Structured JSON logs only; prettify at
  // collection time (e.g. `pino-pretty` on the log drain).
  transport: undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'secret', 'apiKey'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  browser: {
    asObject: true,
    serialize: true,
  },
});

export function getLoggerWithCorrelation(component?: string) {
  const corrId = correlationIdStorage?.getStore();
  const base = component ? logger.child({ component }) : logger;
  return corrId ? base.child({ correlationId: corrId }) : base;
}
