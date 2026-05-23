import { describe, it, expect } from '@jest/globals'
import { ApiError } from '../middleware/errorHandler'
import {
  validateTradeCreation,
  validateTradeUpdate,
  validateTradeClose,
  validatePaginationFilter,
} from '../utils/validators'

/**
 * Phase 6.1: Testing & Quality - Validator Unit Tests
 *
 * Tests input validation functions that protect data integrity
 * across all trades endpoints. Validators throw ApiError on failure.
 */

describe('Validators - Trade Input Validation', () => {
  describe('validateTradeCreation', () => {
    it('should accept valid trade creation data', () => {
      const validData = {
        symbol: 'SPY',
        entry_price: 100.0,
        strategy: 'Support Bounce',
        date_entry: '2026-05-22',
      }

      expect(() => validateTradeCreation(validData)).not.toThrow()
    })

    it('should throw error for missing symbol', () => {
      const invalidData = {
        entry_price: 100.0,
        strategy: 'Test',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
      expect(() => validateTradeCreation(invalidData)).toThrow(/symbol/i)
    })

    it('should throw error for empty symbol', () => {
      const invalidData = {
        symbol: '',
        entry_price: 100.0,
        strategy: 'Test',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
    })

    it('should throw error for non-string symbol', () => {
      const invalidData = {
        symbol: 123,
        entry_price: 100.0,
        strategy: 'Test',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
    })

    it('should require entry_price field', () => {
      const invalidData = {
        symbol: 'SPY',
        strategy: 'Test',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
      expect(() => validateTradeCreation(invalidData)).toThrow(/entry price/i)
    })

    it('should reject zero entry_price', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 0,
        strategy: 'Test',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
    })

    it('should reject negative entry_price', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: -100,
        strategy: 'Test',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
    })

    it('should reject non-numeric entry_price', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 'not-a-number',
        strategy: 'Test',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
    })

    it('should require strategy field', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 100.0,
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
      expect(() => validateTradeCreation(invalidData)).toThrow(/strategy/i)
    })

    it('should accept optional date_entry field', () => {
      const validData = {
        symbol: 'SPY',
        entry_price: 100.0,
        strategy: 'Test',
        date_entry: '2026-05-22',
      }

      expect(() => validateTradeCreation(validData)).not.toThrow()
    })

    it('should validate date_entry format', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 100.0,
        strategy: 'Test',
        date_entry: 'invalid-date',
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
      expect(() => validateTradeCreation(invalidData)).toThrow(/date/i)
    })

    it('should accept optional numeric fields', () => {
      const validData = {
        symbol: 'SPY',
        entry_price: 100.0,
        strategy: 'Test',
        strike_price: 450,
        delta: 0.65,
        iv_percent: 25.5,
      }

      expect(() => validateTradeCreation(validData)).not.toThrow()
    })

    it('should reject negative optional numeric fields', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 100.0,
        strategy: 'Test',
        strike_price: -450,
      }

      expect(() => validateTradeCreation(invalidData)).toThrow(ApiError)
    })
  })

  describe('validateTradeUpdate', () => {
    it('should accept empty update (partial update)', () => {
      expect(() => validateTradeUpdate({})).not.toThrow()
    })

    it('should accept partial symbol update', () => {
      const data = { symbol: 'QQQ' }
      expect(() => validateTradeUpdate(data)).not.toThrow()
    })

    it('should reject empty symbol in update', () => {
      const data = { symbol: '' }
      expect(() => validateTradeUpdate(data)).toThrow(ApiError)
    })

    it('should accept status update with valid value', () => {
      const data = { status: 'closed' }
      expect(() => validateTradeUpdate(data)).not.toThrow()
    })

    it('should reject status update with invalid value', () => {
      const data = { status: 'invalid' }
      expect(() => validateTradeUpdate(data)).toThrow(ApiError)
      expect(() => validateTradeUpdate(data)).toThrow(/open|closed/i)
    })

    it('should accept positive numeric updates', () => {
      const data = {
        exit_price: 110.0,
        take_profit: 120.0,
        stop_loss: 95.0,
      }

      expect(() => validateTradeUpdate(data)).not.toThrow()
    })

    it('should reject negative numeric updates', () => {
      const data = { exit_price: -100 }
      expect(() => validateTradeUpdate(data)).toThrow(ApiError)
    })

    it('should validate exit_price format', () => {
      const data = { exit_price: 'not-a-number' }
      expect(() => validateTradeUpdate(data)).toThrow(ApiError)
    })
  })

  describe('validateTradeClose', () => {
    it('should accept valid close parameters', () => {
      expect(() => validateTradeClose(110.0, '2026-05-23')).not.toThrow()
    })

    it('should accept close without exit date', () => {
      expect(() => validateTradeClose(110.0)).not.toThrow()
    })

    it('should require exit_price', () => {
      expect(() => validateTradeClose(null)).toThrow(ApiError)
      expect(() => validateTradeClose(undefined)).toThrow(ApiError)
    })

    it('should reject zero exit_price', () => {
      expect(() => validateTradeClose(0)).toThrow(ApiError)
    })

    it('should reject negative exit_price', () => {
      expect(() => validateTradeClose(-100)).toThrow(ApiError)
    })

    it('should reject non-numeric exit_price', () => {
      expect(() => validateTradeClose('not-a-number')).toThrow(ApiError)
    })

    it('should validate exit_date format', () => {
      expect(() => validateTradeClose(110.0, 'invalid-date')).toThrow(ApiError)
    })

    it('should accept valid ISO date for exit_date', () => {
      expect(() => validateTradeClose(110.0, '2026-05-23')).not.toThrow()
      expect(() => validateTradeClose(110.0, '2026-05-23T14:30:00Z')).not.toThrow()
    })
  })

  describe('validatePaginationFilter', () => {
    it('should accept empty pagination params', () => {
      expect(() => validatePaginationFilter({})).not.toThrow()
    })

    it('should accept valid limit', () => {
      expect(() => validatePaginationFilter({ limit: 50 })).not.toThrow()
    })

    it('should reject limit below 1', () => {
      expect(() => validatePaginationFilter({ limit: 0 })).toThrow(ApiError)
      expect(() => validatePaginationFilter({ limit: -1 })).toThrow(ApiError)
    })

    it('should reject limit above 500', () => {
      expect(() => validatePaginationFilter({ limit: 501 })).toThrow(ApiError)
    })

    it('should reject non-numeric limit', () => {
      expect(() => validatePaginationFilter({ limit: 'fifty' })).toThrow(ApiError)
    })

    it('should accept valid offset', () => {
      expect(() => validatePaginationFilter({ offset: 0 })).not.toThrow()
      expect(() => validatePaginationFilter({ offset: 100 })).not.toThrow()
    })

    it('should reject negative offset', () => {
      expect(() => validatePaginationFilter({ offset: -1 })).toThrow(ApiError)
    })

    it('should accept valid sort', () => {
      expect(() => validatePaginationFilter({ sort: 'created_at' })).not.toThrow()
      expect(() => validatePaginationFilter({ sort: 'entry_price' })).not.toThrow()
    })

    it('should reject invalid sort characters', () => {
      expect(() => validatePaginationFilter({ sort: 'invalid;drop' })).toThrow(ApiError)
      expect(() => validatePaginationFilter({ sort: 'invalid-sort' })).toThrow(ApiError)
    })

    it('should accept valid direction', () => {
      expect(() => validatePaginationFilter({ direction: 'ASC' })).not.toThrow()
      expect(() => validatePaginationFilter({ direction: 'DESC' })).not.toThrow()
      expect(() => validatePaginationFilter({ direction: 'asc' })).not.toThrow()
      expect(() => validatePaginationFilter({ direction: 'desc' })).not.toThrow()
    })

    it('should reject invalid direction', () => {
      expect(() => validatePaginationFilter({ direction: 'INVALID' })).toThrow(ApiError)
    })

    it('should accept valid status filter', () => {
      expect(() => validatePaginationFilter({ status: 'open' })).not.toThrow()
      expect(() => validatePaginationFilter({ status: 'closed' })).not.toThrow()
    })

    it('should reject invalid status filter', () => {
      expect(() => validatePaginationFilter({ status: 'invalid' })).toThrow(ApiError)
    })

    it('should accept valid strategy filter', () => {
      expect(() => validatePaginationFilter({ strategy: 'Support Bounce' })).not.toThrow()
    })

    it('should reject empty strategy filter', () => {
      expect(() => validatePaginationFilter({ strategy: '' })).toThrow(ApiError)
    })

    it('should accept valid symbol filter', () => {
      expect(() => validatePaginationFilter({ symbol: 'SPY' })).not.toThrow()
    })

    it('should reject empty symbol filter', () => {
      expect(() => validatePaginationFilter({ symbol: '' })).toThrow(ApiError)
    })

    it('should accept combined valid filters', () => {
      expect(() =>
        validatePaginationFilter({
          limit: 50,
          offset: 0,
          sort: 'date_entry',
          direction: 'DESC',
          status: 'open',
          symbol: 'SPY',
        })
      ).not.toThrow()
    })
  })
})
