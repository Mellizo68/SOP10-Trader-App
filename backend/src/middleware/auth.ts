import { Request, Response, NextFunction } from 'express';

/**
 * Authentication Middleware (Stub - Phase 7)
 * Full authentication coming in Phase 7
 */

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Stub: allow all requests for now
  next();
};
