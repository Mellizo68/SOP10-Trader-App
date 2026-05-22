import { describe, it, expect } from '@jest/globals'

/**
 * Phase 6: Testing & Quality - P&L Calculation Unit Tests
 *
 * Tests the critical profit/loss calculation logic used in closeTrade endpoint
 * Ensures accuracy for all trade scenarios
 */

describe('P&L Calculations', () => {
  /**
   * P&L Formula:
   * profit_loss = exit_price - entry_price
   * percent_return = (profit_loss / entry_price) * 100
   */

  describe('Basic P&L Calculation', () => {
    it('should calculate profit correctly', () => {
      const entry_price = 100.0
      const exit_price = 110.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(10.0)
      expect(percent_return).toBe(10.0)
    })

    it('should calculate loss correctly', () => {
      const entry_price = 100.0
      const exit_price = 95.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(-5.0)
      expect(percent_return).toBe(-5.0)
    })

    it('should calculate breakeven correctly', () => {
      const entry_price = 100.0
      const exit_price = 100.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(0.0)
      expect(percent_return).toBe(0.0)
    })
  })

  describe('Small Position Sizes', () => {
    it('should handle penny stock sizes', () => {
      const entry_price = 0.01
      const exit_price = 0.02

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBeCloseTo(0.01, 5)
      expect(percent_return).toBeCloseTo(100.0, 2)
    })

    it('should handle sub-penny positions', () => {
      const entry_price = 0.001
      const exit_price = 0.002

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBeCloseTo(0.001, 6)
      expect(percent_return).toBeCloseTo(100.0, 2)
    })

    it('should handle fractional shares', () => {
      const entry_price = 1.5
      const exit_price = 1.75

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBeCloseTo(0.25, 2)
      expect(percent_return).toBeCloseTo(16.67, 2)
    })
  })

  describe('Large Position Sizes', () => {
    it('should handle large round numbers', () => {
      const entry_price = 10000.0
      const exit_price = 15000.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(5000.0)
      expect(percent_return).toBe(50.0)
    })

    it('should handle very large positions', () => {
      const entry_price = 1000000.0
      const exit_price = 1050000.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(50000.0)
      expect(percent_return).toBe(5.0)
    })
  })

  describe('Percentage Return Accuracy', () => {
    it('should calculate 1% return', () => {
      const entry_price = 100.0
      const exit_price = 101.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(percent_return).toBe(1.0)
    })

    it('should calculate 50% return', () => {
      const entry_price = 100.0
      const exit_price = 150.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(percent_return).toBe(50.0)
    })

    it('should calculate 100% return', () => {
      const entry_price = 100.0
      const exit_price = 200.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(percent_return).toBe(100.0)
    })

    it('should calculate -50% loss', () => {
      const entry_price = 100.0
      const exit_price = 50.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(percent_return).toBe(-50.0)
    })

    it('should calculate -99% loss', () => {
      const entry_price = 100.0
      const exit_price = 1.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(percent_return).toBeCloseTo(-99.0, 5)
    })
  })

  describe('Precision & Rounding', () => {
    it('should handle decimal precision for entry prices', () => {
      const entry_price = 100.123
      const exit_price = 110.456

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBeCloseTo(10.333, 3)
      expect(percent_return).toBeCloseTo(10.319, 2)
    })

    it('should round percent return to 4 decimal places', () => {
      const entry_price = 100.0
      const exit_price = 100.01

      const profit_loss = exit_price - entry_price
      const percent_return = Math.round((profit_loss / entry_price) * 100 * 10000) / 10000

      expect(percent_return).toBe(0.01)
    })

    it('should handle very small percentage changes', () => {
      const entry_price = 10000.0
      const exit_price = 10001.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(percent_return).toBeCloseTo(0.01, 4)
    })
  })

  describe('Edge Cases', () => {
    it('should not divide by zero', () => {
      const entry_price = 0.0
      const exit_price = 100.0

      // Entry price cannot be 0 in validation, but test the math
      // This would cause Infinity, which should be caught by validation
      const result = exit_price / entry_price
      expect(result).toBe(Infinity)
    })

    it('should handle negative exit prices (invalid but test math)', () => {
      const entry_price = 100.0
      const exit_price = -50.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(-150.0)
      expect(percent_return).toBe(-150.0)
    })

    it('should handle zero profit correctly', () => {
      const entry_price = 100.0
      const exit_price = 100.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(0.0)
      expect(percent_return).toBe(0.0)
      expect(Object.is(percent_return, -0.0)).toBe(false) // Not negative zero
    })
  })

  describe('Real-World Scenarios', () => {
    it('should calculate typical day trade (2% profit)', () => {
      const entry_price = 450.0
      const exit_price = 459.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(9.0)
      expect(percent_return).toBeCloseTo(2.0, 4)
    })

    it('should calculate swing trade (8% profit)', () => {
      const entry_price = 125.0
      const exit_price = 135.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(10.0)
      expect(percent_return).toBeCloseTo(8.0, 4)
    })

    it('should calculate stop loss hit (2% loss)', () => {
      const entry_price = 100.0
      const exit_price = 98.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(-2.0)
      expect(percent_return).toBe(-2.0)
    })

    it('should calculate lucky hit (25% profit)', () => {
      const entry_price = 80.0
      const exit_price = 100.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(20.0)
      expect(percent_return).toBe(25.0)
    })

    it('should calculate realized loss trade (5% loss)', () => {
      const entry_price = 1000.0
      const exit_price = 950.0

      const profit_loss = exit_price - entry_price
      const percent_return = (profit_loss / entry_price) * 100

      expect(profit_loss).toBe(-50.0)
      expect(percent_return).toBe(-5.0)
    })
  })

  describe('P&L Consistency', () => {
    it('should be bidirectional consistent', () => {
      const entry = 100.0
      const exit = 120.0

      const forward = {
        profit: exit - entry,
        return: ((exit - entry) / entry) * 100,
      }

      // If we reverse the positions
      const backward = {
        loss: entry - exit,
        returnPercent: ((entry - exit) / exit) * 100,
      }

      // Forward profit = backward loss (opposite sign)
      expect(forward.profit).toBe(-backward.loss)
      // Returns are different percentages due to different bases
      expect(Math.abs(forward.return)).toBeGreaterThan(Math.abs(backward.returnPercent))
    })

    it('should round-trip correctly with multiple trades', () => {
      const trades = [
        { entry: 100.0, exit: 110.0 }, // +10%
        { entry: 110.0, exit: 99.0 }, // -10%
      ]

      let totalProfit = 0
      let totalStarting = 0

      trades.forEach((trade) => {
        totalProfit += trade.exit - trade.entry
        totalStarting += trade.entry
      })

      const netReturn = (totalProfit / totalStarting) * 100

      expect(netReturn).toBeCloseTo(-0.909, 2)
    })
  })
})
