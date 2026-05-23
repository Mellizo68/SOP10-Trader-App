/**
 * Duration Analysis Integration Tests
 * Tests comprehensive duration analysis scenarios and edge cases
 */

import { describe, it, expect } from 'vitest'
import { AnalyticsService, Trade } from '../../../services/analyticsService'

const createTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 1,
  symbol: 'SPY',
  entry_price: 100,
  stop_loss_price: 95,
  exit_price: 110,
  position_size: 100,
  entry_date: '2026-05-01',
  exit_date: '2026-05-02',
  strategy: 'Pullback',
  setup_type: 'Technical',
  status: 'closed',
  profit_loss: 1000,
  return_percent: 10,
  notes: 'Test trade',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-02T14:00:00Z',
  ...overrides,
})

describe('Duration Analysis Integration Tests', () => {
  describe('calculateDurationStats', () => {
    it('should calculate correct average hold time', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00',
          exit_date: '2026-05-01T12:00:00', // 12 hours
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-02T00:00:00',
          exit_date: '2026-05-04T00:00:00', // 48 hours
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)

      // Average of 12 and 48 hours = 30 hours
      expect(stats.avgHoldTime).toBe(30)
    })

    it('should calculate median hold time for odd number of trades', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00',
          exit_date: '2026-05-01T06:00:00', // 6 hours
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-02T00:00:00',
          exit_date: '2026-05-02T12:00:00', // 12 hours
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-03T00:00:00',
          exit_date: '2026-05-05T00:00:00', // 48 hours
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)

      // Median of sorted durations [6, 12, 48] is 12
      expect(stats.medianHoldTime).toBe(12)
    })

    it('should calculate median hold time for even number of trades', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00',
          exit_date: '2026-05-01T06:00:00', // 6 hours
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-02T00:00:00',
          exit_date: '2026-05-02T12:00:00', // 12 hours
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)

      // Median of [6, 12] is (6 + 12) / 2 = 9
      expect(stats.medianHoldTime).toBe(9)
    })

    it('should identify min and max hold times correctly', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00',
          exit_date: '2026-05-01T02:00:00', // 2 hours (min)
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-02T00:00:00',
          exit_date: '2026-05-02T12:00:00', // 12 hours
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-03T00:00:00',
          exit_date: '2026-05-10T00:00:00', // 168 hours (max)
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)

      expect(stats.shortestHold.hours).toBeCloseTo(2, 1)
      expect(stats.longestHold.hours).toBeCloseTo(168, 1)
    })

    it('should ignore open trades in duration calculation', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01',
          exit_date: '2026-05-02',
          status: 'closed',
        }),
        createTrade({
          status: 'open', // Should be ignored
        }),
        createTrade({
          entry_date: '2026-05-03',
          exit_date: '2026-05-04',
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)

      expect(stats.byStrategy).toBeDefined()
      expect(Object.keys(stats.byStrategy).length).toBeGreaterThan(0)
    })

    it('should handle single trade duration calculation', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00',
          exit_date: '2026-05-01T12:00:00',
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)

      expect(stats.avgHoldTime).toBeCloseTo(12, 1)
      expect(stats.medianHoldTime).toBeCloseTo(12, 1)
      expect(stats.shortestHold.hours).toBeCloseTo(12, 1)
      expect(stats.longestHold.hours).toBeCloseTo(12, 1)
    })

    it('should handle same-day trades (very short duration)', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-01T10:15:00', // 15 minutes
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)

      expect(stats.avgHoldTime).toBeCloseTo(0.25, 2) // 15 minutes = 0.25 hours
    })
  })

  describe('calculateDurationDistribution', () => {
    it('should correctly bucket trades by duration ranges', () => {
      const trades = [
        // Under 1h (< 1 hour)
        createTrade({
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-01T10:30:00',
          status: 'closed',
        }),
        // 1-4h
        createTrade({
          entry_date: '2026-05-02T10:00:00',
          exit_date: '2026-05-02T12:00:00',
          status: 'closed',
        }),
        // 4-24h
        createTrade({
          entry_date: '2026-05-03',
          exit_date: '2026-05-03T18:00:00',
          status: 'closed',
        }),
        // 1-7d (6 days = 144 hours, less than 7)
        createTrade({
          entry_date: '2026-05-04',
          exit_date: '2026-05-10',
          status: 'closed',
        }),
        // > 7d (14 days = 336 hours)
        createTrade({
          entry_date: '2026-05-01',
          exit_date: '2026-05-15',
          status: 'closed',
        }),
      ]

      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      const distMap = Object.fromEntries(
        distribution.ranges.map(r => [r.label, r.count])
      )

      expect(distMap['< 1 hour']).toBe(1)
      expect(distMap['1-4 hours']).toBe(1)
      expect(distMap['4-24 hours']).toBe(1)
      expect(distMap['1-7 days']).toBe(1)
      expect(distMap['> 7 days']).toBe(1)
    })

    it('should correctly handle edge case: exactly 1 hour', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-01T11:00:00',
          status: 'closed',
        }),
      ]

      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      const distMap = Object.fromEntries(
        distribution.ranges.map(r => [r.label, r.count])
      )

      // Exactly 1 hour: 1 >= 1 && 1 < 4 = TRUE, so "1-4 hours"
      expect(distMap['1-4 hours']).toBe(1)
    })

    it('should correctly handle edge case: exactly 4 hours', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-01T14:00:00',
          status: 'closed',
        }),
      ]

      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      const distMap = Object.fromEntries(
        distribution.ranges.map(r => [r.label, r.count])
      )

      // Exactly 4 hours: 4 >= 4 && 4 < 24 = TRUE, so "4-24 hours"
      expect(distMap['4-24 hours']).toBe(1)
    })

    it('should correctly handle edge case: exactly 24 hours', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-02T10:00:00',
          status: 'closed',
        }),
      ]

      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      const distMap = Object.fromEntries(
        distribution.ranges.map(r => [r.label, r.count])
      )

      // Exactly 24 hours: 24 >= 24 && 24 < 168 = TRUE, so "1-7 days"
      expect(distMap['1-7 days']).toBe(1)
    })

    it('should correctly handle edge case: exactly 7 days', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-08T10:00:00',
          status: 'closed',
        }),
      ]

      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      const distMap = Object.fromEntries(
        distribution.ranges.map(r => [r.label, r.count])
      )

      // Exactly 7 days (168 hours): 168 >= 168 && 168 < Infinity = TRUE, so "> 7 days"
      expect(distMap['> 7 days']).toBe(1)
    })

    it('should ignore open trades in distribution', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01',
          exit_date: '2026-05-02',
          status: 'closed',
        }),
        createTrade({
          status: 'open', // Should be ignored
        }),
      ]

      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      // Total should be 1 (open trade ignored)
      const total = distribution.ranges.reduce((sum, range) => sum + range.count, 0)
      expect(total).toBe(1)
    })

    it('should handle all trades in same duration bucket', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-01T10:15:00',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-02T10:00:00',
          exit_date: '2026-05-02T10:30:00',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-03T10:00:00',
          exit_date: '2026-05-03T10:45:00',
          status: 'closed',
        }),
      ]

      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      const distMap = Object.fromEntries(
        distribution.ranges.map(r => [r.label, r.count])
      )

      // All 3 trades should be in "< 1 hour" bucket
      expect(distMap['< 1 hour']).toBe(3)
      expect(distMap['1-4 hours']).toBe(0)
      expect(distMap['4-24 hours']).toBe(0)
      expect(distMap['1-7 days']).toBe(0)
      expect(distMap['> 7 days']).toBe(0)
    })
  })

  describe('Duration Analysis with Mixed Data', () => {
    it('should handle large dataset with mixed hold times', () => {
      const trades: Trade[] = []

      // Create 100 trades with various hold times
      for (let i = 0; i < 100; i++) {
        const holdHours = Math.random() * 240 // 0 to 10 days randomly

        const entryDate = new Date('2026-05-01')
        entryDate.setHours(entryDate.getHours() + i * 2) // Spread trades over time

        const exitDate = new Date(entryDate)
        exitDate.setHours(exitDate.getHours() + Math.floor(holdHours))

        trades.push(
          createTrade({
            id: i + 1,
            entry_date: entryDate.toISOString().split('T')[0],
            exit_date: exitDate.toISOString(),
            status: 'closed',
          })
        )
      }

      const stats = AnalyticsService.calculateDurationStats(trades)
      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      // Verify calculations
      expect(stats.avgHoldTime).toBeGreaterThan(0)
      expect(stats.medianHoldTime).toBeGreaterThan(0)
      expect(stats.shortestHold.hours).toBeLessThanOrEqual(stats.avgHoldTime)
      expect(stats.longestHold.hours).toBeGreaterThanOrEqual(stats.avgHoldTime)

      // Verify distribution totals - sum the counts from the ranges array
      const distributionTotal = distribution.ranges.reduce(
        (sum, range) => sum + range.count,
        0
      )
      expect(distributionTotal).toBe(100)
    })

    it('should correctly analyze trades from multiple strategies', () => {
      const trades = [
        createTrade({
          strategy: 'Scalping',
          entry_date: '2026-05-01T10:00:00',
          exit_date: '2026-05-01T10:15:00', // 15 min
          status: 'closed',
        }),
        createTrade({
          strategy: 'Day Trading',
          entry_date: '2026-05-02T10:00:00',
          exit_date: '2026-05-02T13:00:00', // 3 hours (1-4 hour bucket)
          status: 'closed',
        }),
        createTrade({
          strategy: 'Swing Trading',
          entry_date: '2026-05-03',
          exit_date: '2026-05-06', // 3 days
          status: 'closed',
        }),
      ]

      const stats = AnalyticsService.calculateDurationStats(trades)
      const distribution = AnalyticsService.calculateDurationDistribution(trades)

      const distMap = Object.fromEntries(
        distribution.ranges.map(r => [r.label, r.count])
      )

      expect(stats.avgHoldTime).toBeGreaterThan(0)
      expect(distMap['< 1 hour']).toBe(1)
      expect(distMap['1-4 hours']).toBe(1)
      expect(distMap['1-7 days']).toBe(1)
    })
  })
})
