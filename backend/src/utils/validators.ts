import { TradeEntry } from '../types'
import { ApiError } from '../middleware/errorHandler'

export const validateTrade = (data: Partial<TradeEntry>): void => {
  if (!data.symbol || data.symbol.trim() === '') {
    throw new ApiError(400, 'Symbol is required')
  }

  if (!data.strategy || data.strategy.trim() === '') {
    throw new ApiError(400, 'Strategy is required')
  }

  if (data.entryPrice === undefined || data.entryPrice <= 0) {
    throw new ApiError(400, 'Entry price must be greater than 0')
  }

  if (data.status && !['open', 'closed', 'cancelled'].includes(data.status)) {
    throw new ApiError(400, 'Invalid status value')
  }
}

export const validateCloseRequest = (exitPrice: number, exitDate: string): void => {
  if (!exitPrice || exitPrice <= 0) {
    throw new ApiError(400, 'Exit price must be greater than 0')
  }

  if (!exitDate) {
    throw new ApiError(400, 'Exit date is required')
  }

  const date = new Date(exitDate)
  if (isNaN(date.getTime())) {
    throw new ApiError(400, 'Invalid exit date format')
  }
}

export const validatePaginationParams = (limit?: number, offset?: number): { limit: number; offset: number } => {
  const validLimit = Math.min(limit && limit > 0 ? limit : 20, 100)
  const validOffset = offset && offset >= 0 ? offset : 0

  return { limit: validLimit, offset: validOffset }
}
