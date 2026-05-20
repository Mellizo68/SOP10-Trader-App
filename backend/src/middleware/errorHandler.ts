import { Request, Response, NextFunction } from 'express'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err)

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message
    })
    return
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  })
}
