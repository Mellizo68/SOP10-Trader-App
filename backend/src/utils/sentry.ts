import * as Sentry from '@sentry/node'
import logger from './logger.js'

/**
 * Sentry Integration for Error Tracking
 * Initializes error capture, performance monitoring, and release tracking
 */

export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured', {
      env: 'SENTRY_DSN',
      warning: 'Error tracking disabled',
    });
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    beforeSend(event, hint) {
      // Filter out 4xx errors (don't track validation errors)
      if (event.exception) {
        const error = hint.originalException;
        if (
          error instanceof Error &&
          error.message &&
          error.message.includes('4')
        ) {
          return null;
        }
      }
      return event;
    },
  });

  logger.info('Sentry initialized', {
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

export { Sentry }
