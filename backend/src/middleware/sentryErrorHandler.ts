import { Request, Response, NextFunction } from 'express'
import * as Sentry from '@sentry/node'
import logger from '../utils/logger.js'

/**
 * Sentry Error Handler Middleware
 * Captures exceptions and sends to Sentry dashboard
 * Distinguishes between client errors (4xx) and server errors (5xx)
 */

export function sentryErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.status || err.statusCode || 500;

  // Don't capture 4xx validation/client errors in Sentry (log but don't track)
  if (statusCode >= 400 && statusCode < 500) {
    logger.warn('Client error (not captured in Sentry)', {
      correlationId: req.id,
      status: statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });
  } else {
    // Capture 5xx errors in Sentry for monitoring
    Sentry.captureException(err, {
      tags: {
        path: req.path,
        method: req.method,
        status: String(statusCode),
      },
      contexts: {
        request: {
          url: req.url,
          method: req.method,
          headers: {
            'user-agent': req.get('user-agent'),
            'x-forwarded-for': req.get('x-forwarded-for'),
          },
        },
      },
      user: {
        ip_address: req.ip,
      },
    });

    logger.error('Server error captured in Sentry', {
      correlationId: req.id,
      status: statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });
  }

  next(err);
}
