import { ApiError } from '../middleware/errorHandler.js';

/**
 * Validators (Stub - Phase 5)
 */

export const validateTradeInput = (data: any): void => {
  if (!data.symbol) {
    throw new ApiError(400, 'Symbol is required');
  }
  if (!data.strategy) {
    throw new ApiError(400, 'Strategy is required');
  }
};

export const validateSymbol = (symbol: string): void => {
  if (!symbol || symbol.trim().length === 0) {
    throw new ApiError(400, 'Symbol is required');
  }
};
