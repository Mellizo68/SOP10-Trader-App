import { Request, Response, NextFunction } from 'express'

// Simple API key validation middleware
// For MVP, this is optional. In future versions, add proper JWT auth
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  // Skip auth for MVP (no authentication required)
  // In future, implement:
  // const apiKey = req.headers['x-api-key'] as string
  // if (!apiKey || !isValidApiKey(apiKey)) {
  //   return res.status(401).json({ success: false, error: 'Unauthorized' })
  // }

  next()
}
