import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  validateTradeCreation,
  validateTradeUpdate,
  validateTradeClose,
  validatePaginationFilter,
} from '../utils/validators'

/**
 * Phase 6: Testing & Quality - Validator Unit Tests
 *
 * Tests input validation functions that protect data integrity
 * across all trades endpoints
 */

describe('Validators - Trade Input Validation', () => {
  describe('validateTradeCreation', () => {
    it('should accept valid trade creation data', () => {
      const validData = {
        symbol: 'SPY',
        entry_price: 100.0,
        exit_price: 110.0,
        entry_date: '2026-05-22',
        exit_date: '2026-05-23',
        strategy: 'Support Bounce',
        setup_type: 'Confluence',
        status: 'open',
      }

      const result = validateTradeCreation(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should require symbol field', () => {
      const invalidData = {
        entry_price: 100.0,
        exit_price: 110.0,
        strategy: 'Test',
      }

      const result = validateTradeCreation(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('symbol'))
    })

    it('should require entry_price field', () => {
      const invalidData = {
        symbol: 'SPY',
        exit_price: 110.0,
        strategy: 'Test',
      }

      const result = validateTradeCreation(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('entry_price'))
    })

    it('should require exit_price field', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 100.0,
        strategy: 'Test',
      }

      const result = validateTradeCreation(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('exit_price'))
    })

    it('should require strategy field', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 100.0,
        exit_price: 110.0,
      }

      const result = validateTradeCreation(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('strategy'))
    })

    it('should validate entry_price is a number', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 'not-a-number',
        exit_price: 110.0,
        strategy: 'Test',
      }

      const result = validateTradeCreation(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('number'))
    })

    it('should validate exit_price is a number', () => {
      const invalidData = {
        symbol: 'SPY',
        entry_price: 100.0,
        exit_price: 'not-a-number',
        strategy: 'Test',
      }

      const result = validateTradeCreation(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('number'))
    })

    it('should validate symbol is uppercase', () => {
      const lowercaseData = {
        symbol: 'spy', // lowercase
        entry_price: 100.0,
        exit_price: 110.0,
        strategy: 'Test',
      }

      const result = validateTradeCreation(lowercaseData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('symbol'))
    })

    it('should validate symbol is 1-5 characters', () => {
      const tooLongSymbol = {
        symbol: 'VERYLONGSYMBOL',
        entry_price: 100.0,
        exit_price: 110.0,
        strategy: 'Test',
      }

      const result = validateTradeCreation(tooLongSymbol)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('symbol'))
    })

    it('should validate strategy is 2-100 characters', () => {
      const tooShortStrategy = {
        symbol: 'SPY',
        entry_price: 100.0,
        exit_price: 110.0,
        strategy: 'A', // Too short
      }

      const result = validateTradeCreation(tooShortStrategy)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('strategy'))
    })

    it('should accept optional fields', () => {
      const minimalData = {
        symbol: 'SPY',
        entry_price: 100.0,
        exit_price: 110.0,
        strategy: 'Support Bounce',
        // delta, iv_percent, days_to_expiration, etc. are optional
      }

      const result = validateTradeCreation(minimalData)
      expect(result.isValid).toBe(true)
    })

    it('should validate date format YYYY-MM-DD', () => {
      const invalidDateData = {
        symbol: 'SPY',
        entry_price: 100.0,
        exit_price: 110.0,
        strategy: 'Test',
        entry_date: '05-22-2026', // Wrong format
      }

      const result = validateTradeCreation(invalidDateData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('date'))
    })
  })

  describe('validateTradeUpdate', () => {
    it('should accept partial trade update', () => {
      const updateData = {
        exit_price: 105.0,
      }

      const result = validateTradeUpdate(updateData)
      expect(result.isValid).toBe(true)
    })

    it('should accept empty update object', () => {
      const emptyUpdate = {}

      const result = validateTradeUpdate(emptyUpdate)
      expect(result.isValid).toBe(true)
    })

    it('should validate numeric fields when provided', () => {
      const invalidUpdate = {
        exit_price: 'not-a-number',
      }

      const result = validateTradeUpdate(invalidUpdate)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('number'))
    })

    it('should validate status when provided', () => {
      const invalidStatus = {
        status: 'invalid-status',
      }

      const result = validateTradeUpdate(invalidStatus)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('status'))
    })

    it('should accept valid status values', () => {
      const validStatuses = ['open', 'closed']

      validStatuses.forEach((status) => {
        const updateData = { status }
        const result = validateTradeUpdate(updateData)
        expect(result.isValid).toBe(true)
      })
    })

    it('should allow multiple field updates', () => {
      const multiUpdate = {
        exit_price: 105.0,
        comments: 'Updated comment',
        strategy: 'New Strategy Name',
      }

      const result = validateTradeUpdate(multiUpdate)
      expect(result.isValid).toBe(true)
    })
  })

  describe('validateTradeClose', () => {
    it('should require exit_price when closing trade', () => {
      const noExitPrice = {
        exit_date: '2026-05-23',
      }

      const result = validateTradeClose(noExitPrice)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('exit_price'))
    })

    it('should accept exit_price and exit_date', () => {
      const closeData = {
        exit_price: 110.0,
        exit_date: '2026-05-23',
      }

      const result = validateTradeClose(closeData)
      expect(result.isValid).toBe(true)
    })

    it('should make exit_date optional', () => {
      const closeDataNoDate = {
        exit_price: 110.0,
      }

      const result = validateTradeClose(closeDataNoDate)
      expect(result.isValid).toBe(true)
    })

    it('should validate exit_price is a number', () => {
      const invalidPrice = {
        exit_price: 'not-a-number',
      }

      const result = validateTradeClose(invalidPrice)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('number'))
    })

    it('should validate exit_price is positive', () => {
      const negativePrice = {
        exit_price: -110.0,
      }

      const result = validateTradeClose(negativePrice)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('positive'))
    })

    it('should validate exit_date format', () => {
      const invalidDate = {
        exit_price: 110.0,
        exit_date: '2026/05/23', // Wrong format
      }

      const result = validateTradeClose(invalidDate)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('date'))
    })
  })

  describe('validatePaginationFilter', () => {
    it('should accept default pagination params', () => {
      const params = {
        limit: 50,
        offset: 0,
      }

      const result = validatePaginationFilter(params)
      expect(result.isValid).toBe(true)
    })

    it('should enforce limit between 1 and 500', () => {
      const tooSmall = { limit: 0 }
      const tooLarge = { limit: 501 }

      expect(validatePaginationFilter(tooSmall).isValid).toBe(false)
      expect(validatePaginationFilter(tooLarge).isValid).toBe(false)
    })

    it('should accept limit at boundaries', () => {
      const minLimit = { limit: 1 }
      const maxLimit = { limit: 500 }

      expect(validatePaginationFilter(minLimit).isValid).toBe(true)
      expect(validatePaginationFilter(maxLimit).isValid).toBe(true)
    })

    it('should enforce offset >= 0', () => {
      const negativeOffset = { offset: -1 }

      const result = validatePaginationFilter(negativeOffset)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('offset'))
    })

    it('should accept any non-negative offset', () => {
      const largeOffset = { offset: 10000 }

      const result = validatePaginationFilter(largeOffset)
      expect(result.isValid).toBe(true)
    })

    it('should validate sort field when provided', () => {
      const validSort = { sort: 'created_at' }
      const invalidSort = { sort: 'invalid_field' }

      expect(validatePaginationFilter(validSort).isValid).toBe(true)
      expect(validatePaginationFilter(invalidSort).isValid).toBe(false)
    })

    it('should validate direction when provided', () => {
      const validDirections = [
        { direction: 'ASC' },
        { direction: 'DESC' },
      ]

      const invalidDirection = { direction: 'INVALID' }

      validDirections.forEach((params) => {
        expect(validatePaginationFilter(params).isValid).toBe(true)
      })

      expect(validatePaginationFilter(invalidDirection).isValid).toBe(false)
    })

    it('should allow filtering by status', () => {
      const filterByStatus = { status: 'open' }

      const result = validatePaginationFilter(filterByStatus)
      expect(result.isValid).toBe(true)
    })

    it('should allow filtering by symbol', () => {
      const filterBySymbol = { symbol: 'SPY' }

      const result = validatePaginationFilter(filterBySymbol)
      expect(result.isValid).toBe(true)
    })

    it('should allow filtering by strategy', () => {
      const filterByStrategy = { strategy: 'Support Bounce' }

      const result = validatePaginationFilter(filterByStrategy)
      expect(result.isValid).toBe(true)
    })

    it('should allow date range filtering', () => {
      const dateRange = {
        dateStart: '2026-05-01',
        dateEnd: '2026-05-31',
      }

      const result = validatePaginationFilter(dateRange)
      expect(result.isValid).toBe(true)
    })

    it('should validate dateEnd is after dateStart', () => {
      const invalidRange = {
        dateStart: '2026-05-31',
        dateEnd: '2026-05-01', // Before start
      }

      const result = validatePaginationFilter(invalidRange)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('date'))
    })
  })
})
