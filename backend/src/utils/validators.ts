import { ApiError } from '../middleware/errorHandler';

/**
 * Validators for Trade Management System
 *
 * Validates user input before database operations
 * All validators throw ApiError with 400 status on validation failure
 */

/**
 * Validate trade creation input
 *
 * Required fields:
 * - symbol: non-empty string
 * - strategy: non-empty string
 * - entry_price: positive number
 * - date_entry: valid ISO date
 */
export const validateTradeCreation = (data: any): void => {
  // Symbol validation
  if (!data.symbol || typeof data.symbol !== 'string' || data.symbol.trim().length === 0) {
    throw new ApiError(400, 'Symbol is required and must be a non-empty string');
  }

  // Strategy validation
  if (!data.strategy || typeof data.strategy !== 'string' || data.strategy.trim().length === 0) {
    throw new ApiError(400, 'Strategy is required and must be a non-empty string');
  }

  // Entry price validation
  if (data.entry_price === undefined || data.entry_price === null) {
    throw new ApiError(400, 'Entry price is required');
  }
  if (typeof data.entry_price !== 'number' || data.entry_price <= 0) {
    throw new ApiError(400, 'Entry price must be a positive number');
  }

  // Date entry validation
  if (data.date_entry) {
    const date = new Date(data.date_entry);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, 'Date entry must be a valid ISO date string');
    }
  }

  // Optional numeric fields validation (if provided, must be positive)
  const optionalNumericFields = ['strike_price', 'delta', 'iv_percent', 'take_profit', 'stop_loss', 'confluence_score'];
  optionalNumericFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'number') {
        throw new ApiError(400, `${field} must be a number`);
      }
      if (data[field] < 0) {
        throw new ApiError(400, `${field} must be a positive number`);
      }
    }
  });
};

/**
 * Validate trade update input
 *
 * All fields are optional (partial update)
 * But if provided, must match type constraints
 */
export const validateTradeUpdate = (data: any): void => {
  // Only validate fields that are provided
  if (data.symbol !== undefined) {
    if (typeof data.symbol !== 'string' || data.symbol.trim().length === 0) {
      throw new ApiError(400, 'Symbol must be a non-empty string');
    }
  }

  if (data.strategy !== undefined) {
    if (typeof data.strategy !== 'string' || data.strategy.trim().length === 0) {
      throw new ApiError(400, 'Strategy must be a non-empty string');
    }
  }

  if (data.entry_price !== undefined) {
    if (typeof data.entry_price !== 'number' || data.entry_price <= 0) {
      throw new ApiError(400, 'Entry price must be a positive number');
    }
  }

  if (data.status !== undefined) {
    if (!['open', 'closed'].includes(data.status)) {
      throw new ApiError(400, 'Status must be either "open" or "closed"');
    }
  }

  if (data.date_entry !== undefined) {
    const date = new Date(data.date_entry);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, 'Date entry must be a valid ISO date string');
    }
  }

  // Optional numeric fields validation
  const optionalNumericFields = [
    'strike_price',
    'delta',
    'days_to_expiration',
    'iv_percent',
    'confluence_score',
    'take_profit',
    'stop_loss',
    'exit_price',
  ];
  optionalNumericFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'number') {
        throw new ApiError(400, `${field} must be a number`);
      }
      if (data[field] < 0) {
        throw new ApiError(400, `${field} must be a positive number`);
      }
    }
  });
};

/**
 * Validate trade close input
 *
 * Required fields:
 * - exit_price: positive number
 * - exit_date: optional, must be valid ISO date if provided
 */
export const validateTradeClose = (exitPrice: any, exitDate?: any): void => {
  // Exit price validation
  if (exitPrice === undefined || exitPrice === null) {
    throw new ApiError(400, 'Exit price is required');
  }
  if (typeof exitPrice !== 'number' || exitPrice <= 0) {
    throw new ApiError(400, 'Exit price must be a positive number');
  }

  // Exit date validation (optional)
  if (exitDate !== undefined && exitDate !== null) {
    const date = new Date(exitDate);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, 'Exit date must be a valid ISO date string');
    }
  }
};

/**
 * Validate pagination filter parameters
 */
export const validatePaginationFilter = (params: any): void => {
  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 500) {
      throw new ApiError(400, 'Limit must be a number between 1 and 500');
    }
  }

  if (params.offset !== undefined) {
    if (typeof params.offset !== 'number' || params.offset < 0) {
      throw new ApiError(400, 'Offset must be a non-negative number');
    }
  }

  if (params.sort !== undefined) {
    if (typeof params.sort !== 'string' || !/^[a-zA-Z0-9_]+$/.test(params.sort)) {
      throw new ApiError(400, 'Sort must be alphanumeric with underscores only');
    }
  }

  if (params.direction !== undefined) {
    if (!['ASC', 'DESC'].includes(params.direction?.toUpperCase())) {
      throw new ApiError(400, 'Direction must be either ASC or DESC');
    }
  }

  if (params.status !== undefined) {
    if (!['open', 'closed'].includes(params.status)) {
      throw new ApiError(400, 'Status filter must be either "open" or "closed"');
    }
  }

  if (params.strategy !== undefined) {
    if (typeof params.strategy !== 'string' || params.strategy.trim().length === 0) {
      throw new ApiError(400, 'Strategy filter must be a non-empty string');
    }
  }

  if (params.symbol !== undefined) {
    if (typeof params.symbol !== 'string' || params.symbol.trim().length === 0) {
      throw new ApiError(400, 'Symbol filter must be a non-empty string');
    }
  }
};

/**
 * Legacy validators (kept for compatibility)
 */
export const validateTradeInput = (data: any): void => {
  validateTradeCreation(data);
};

export const validateSymbol = (symbol: string): void => {
  if (!symbol || symbol.trim().length === 0) {
    throw new ApiError(400, 'Symbol is required');
  }
};
