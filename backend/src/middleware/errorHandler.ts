import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

/**
 * Custom API Error Class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log error with appropriate level
  if (statusCode >= 500) {
    logger.error('Server error', {
      correlationId: req.id,
      status: statusCode,
      message,
      path: req.path,
      method: req.method,
      stack: err.stack,
    });
  } else {
    logger.warn('Client error', {
      correlationId: req.id,
      status: statusCode,
      message,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
