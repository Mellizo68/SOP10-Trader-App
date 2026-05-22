import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger.js'
import { metrics } from '../utils/metrics.js'

/**
 * Request Logger Middleware
 * Logs all HTTP requests with correlation IDs for distributed tracing
 * and records metrics for monitoring and observability
 */

declare global {
  namespace Express {
    interface Request {
      id?: string
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate or retrieve correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4()
  req.id = correlationId

  const start = Date.now()

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start

    // Determine log level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'

    logger[logLevel as keyof typeof logger]('HTTP Request', {
      correlationId,
      method: req.method,
      path: req.path,
      query: req.query,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    })

    // Record metrics
    if (res.statusCode >= 500) {
      metrics.recordError(req.path, req.method, duration, 'server')
    } else if (res.statusCode === 429) {
      metrics.recordError(req.path, req.method, duration, 'rateLimit')
    } else if (res.statusCode >= 400 && res.statusCode < 500) {
      metrics.recordError(req.path, req.method, duration, 'validation')
    } else if (res.statusCode === 408 || res.statusCode === 504) {
      metrics.recordError(req.path, req.method, duration, 'timeout')
    } else {
      metrics.recordSuccess(req.path, req.method, duration)
    }
  })

  next()
}
