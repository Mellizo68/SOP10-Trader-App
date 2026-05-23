/**
 * Analytics Service Tests
 * Comprehensive testing of all analytics calculations
 */

import { describe, it, expect } from 'vitest'
import { AnalyticsService, Trade } from '../analyticsService'

// Mock trades factory
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

describe('AnalyticsService', () => {
  describe('calculateMonthlyStats', () => {
    it('should return empty array for empty trades', () => {
      const stats = AnalyticsService.calculateMonthlyStats([])
      expect(stats).toEqual([])
    })

    it('should ignore open trades', () => {
      const trades = [
        createTrade({ status: 'open' }),
        createTrade({ status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats).toHaveLength(1)
    })

    it('should group trades by month', () => {
      const trades = [
        createTrade({ exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ exit_date: '2026-05-15', status: 'closed' }),
        createTrade({ exit_date: '2026-06-01', status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats).toHaveLength(2)
      expect(stats[0].month).toBe('2026-05')
      expect(stats[1].month).toBe('2026-06')
    })

    it('should calculate correct win rate', () => {
      const trades = [
        createTrade({ profit_loss: 100, status: 'closed' }),
        createTrade({ profit_loss: 50, status: 'closed' }),
        createTrade({ profit_loss: -50, status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats[0].wins).toBe(2)
      expect(stats[0].losses).toBe(1)
      expect(stats[0].winRate).toBeCloseTo(66.67, 1)
    })

    it('should calculate correct average win/loss sizes', () => {
      const trades = [
        createTrade({ profit_loss: 100, status: 'closed' }),
        createTrade({ profit_loss: 200, status: 'closed' }),
        createTrade({ profit_loss: -50, status: 'closed' }),
        createTrade({ profit_loss: -150, status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats[0].avgWinSize).toBeCloseTo(150, 0)
      expect(stats[0].avgLossSize).toBeCloseTo(-100, 0)
    })

    it('should calculate correct total P&L', () => {
      const trades = [
        createTrade({ profit_loss: 100, status: 'closed' }),
        createTrade({ profit_loss: 200, status: 'closed' }),
        createTrade({ profit_loss: -50, status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats[0].pnl).toBe(250)
    })

    it('should handle all winning month', () => {
      const trades = [
        createTrade({ profit_loss: 100, status: 'closed' }),
        createTrade({ profit_loss: 200, status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats[0].wins).toBe(2)
      expect(stats[0].losses).toBe(0)
      expect(stats[0].winRate).toBe(100)
    })

    it('should handle all losing month', () => {
      const trades = [
        createTrade({ profit_loss: -100, status: 'closed' }),
        createTrade({ profit_loss: -200, status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats[0].wins).toBe(0)
      expect(stats[0].losses).toBe(2)
      expect(stats[0].winRate).toBe(0)
    })

    it('should handle breakeven trades', () => {
      const trades = [
        createTrade({ profit_loss: 0, status: 'closed' }),
        createTrade({ profit_loss: 100, status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats[0].wins).toBe(1)
      expect(stats[0].losses).toBe(0)
    })

    it('should sort months chronologically', () => {
      const trades = [
        createTrade({ exit_date: '2026-07-01', status: 'closed' }),
        createTrade({ exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ exit_date: '2026-06-01', status: 'closed' }),
      ]
      const stats = AnalyticsService.calculateMonthlyStats(trades)
      expect(stats[0].month).toBe('2026-05')
      expect(stats[1].month).toBe('2026-06')
      expect(stats[2].month).toBe('2026-07')
    })
  })

  describe('calculateStreaks', () => {
    it('should return no streak for empty trades', () => {
      const streak = AnalyticsService.calculateStreaks([])
      expect(streak.current).toBe('none')
      expect(streak.currentCount).toBe(0)
    })

    it('should detect current winning streak', () => {
      const trades = [
        createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ profit_loss: 200, exit_date: '2026-05-02', status: 'closed' }),
        createTrade({ profit_loss: 150, exit_date: '2026-05-03', status: 'closed' }),
      ]
      const streak = AnalyticsService.calculateStreaks(trades)
      expect(streak.current).toBe('win')
      expect(streak.currentCount).toBe(3)
    })

    it('should detect current losing streak', () => {
      const trades = [
        createTrade({ profit_loss: -100, exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ profit_loss: -200, exit_date: '2026-05-02', status: 'closed' }),
      ]
      const streak = AnalyticsService.calculateStreaks(trades)
      expect(streak.current).toBe('loss')
      expect(streak.currentCount).toBe(2)
    })

    it('should identify longest win streak', () => {
      const trades = [
        createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-02', status: 'closed' }),
        createTrade({ profit_loss: -50, exit_date: '2026-05-03', status: 'closed' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-04', status: 'closed' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-05', status: 'closed' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-06', status: 'closed' }),
      ]
      const streak = AnalyticsService.calculateStreaks(trades)
      expect(streak.longestWinStreak).toBe(3)
    })

    it('should identify longest loss streak', () => {
      const trades = [
        createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ profit_loss: -50, exit_date: '2026-05-02', status: 'closed' }),
        createTrade({ profit_loss: -50, exit_date: '2026-05-03', status: 'closed' }),
        createTrade({ profit_loss: -50, exit_date: '2026-05-04', status: 'closed' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-05', status: 'closed' }),
      ]
      const streak = AnalyticsService.calculateStreaks(trades)
      expect(streak.longestLossStreak).toBe(3)
    })

    it('should build complete streak history', () => {
      const trades = [
        createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-02', status: 'closed' }),
        createTrade({ profit_loss: -50, exit_date: '2026-05-03', status: 'closed' }),
        createTrade({ profit_loss: -50, exit_date: '2026-05-04', status: 'closed' }),
      ]
      const streak = AnalyticsService.calculateStreaks(trades)
      expect(streak.allStreaks).toHaveLength(2)
      expect(streak.allStreaks[0].type).toBe('win')
      expect(streak.allStreaks[0].count).toBe(2)
      expect(streak.allStreaks[1].type).toBe('loss')
      expect(streak.allStreaks[1].count).toBe(2)
    })

    it('should ignore open trades in streak calculation', () => {
      const trades = [
        createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-02', status: 'open' }),
        createTrade({ profit_loss: 100, exit_date: '2026-05-03', status: 'closed' }),
      ]
      const streak = AnalyticsService.calculateStreaks(trades)
      expect(streak.currentCount).toBe(2)
    })
  })

  describe('getWinProbability', () => {
    it('should return 50% for streak of 0', () => {
      const prob = AnalyticsService.getWinProbability(0)
      expect(prob).toBe(50)
    })

    it('should return value close to 50% for long streaks', () => {
      const prob = AnalyticsService.getWinProbability(10)
      expect(prob).toBeGreaterThan(40)
      expect(prob).toBeLessThan(60)
    })

    it('should decrease as streak increases', () => {
      const prob1 = AnalyticsService.getWinProbability(1)
      const prob5 = AnalyticsService.getWinProbability(5)
      const prob10 = AnalyticsService.getWinProbability(10)
      expect(prob1).toBeGreaterThan(prob5)
      expect(prob5).toBeGreaterThan(prob10)
    })
  })

  describe('calculateDurationStats', () => {
    it('should return zeros for empty trades', () => {
      const stats = AnalyticsService.calculateDurationStats([])
      expect(stats.avgHoldTime).toBe(0)
      expect(stats.medianHoldTime).toBe(0)
    })

    it('should ignore open trades', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01',
          exit_date: '2026-05-02',
          status: 'open',
        }),
        createTrade({
          entry_date: '2026-05-01',
          exit_date: '2026-05-05',
          status: 'closed',
        }),
      ]
      const stats = AnalyticsService.calculateDurationStats(trades)
      expect(stats.avgHoldTime).toBeCloseTo(96, 0) // 4 days = 96 hours
    })

    it('should calculate average hold time in hours', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T10:00:00Z',
          exit_date: '2026-05-02T14:00:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-03T10:00:00Z',
          exit_date: '2026-05-03T16:00:00Z',
          status: 'closed',
        }),
      ]
      const stats = AnalyticsService.calculateDurationStats(trades)
      expect(stats.avgHoldTime).toBeCloseTo(17, 0) // (28 + 6) / 2 = 17 hours
    })

    it('should calculate median hold time', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-01T01:00:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-02T00:00:00Z',
          exit_date: '2026-05-02T05:00:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-03T00:00:00Z',
          exit_date: '2026-05-03T10:00:00Z',
          status: 'closed',
        }),
      ]
      const stats = AnalyticsService.calculateDurationStats(trades)
      expect(stats.medianHoldTime).toBe(5)
    })

    it('should identify shortest and longest hold trades', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-01T01:00:00Z',
          status: 'closed',
          profit_loss: 50,
        }),
        createTrade({
          entry_date: '2026-05-02T00:00:00Z',
          exit_date: '2026-05-05T00:00:00Z',
          status: 'closed',
          profit_loss: 200,
        }),
      ]
      const stats = AnalyticsService.calculateDurationStats(trades)
      expect(stats.shortestHold.hours).toBe(1)
      expect(stats.longestHold.hours).toBe(72)
    })

    it('should calculate average hold time by strategy', () => {
      const trades = [
        createTrade({
          strategy: 'Pullback',
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-01T02:00:00Z',
          status: 'closed',
        }),
        createTrade({
          strategy: 'Pullback',
          entry_date: '2026-05-02T00:00:00Z',
          exit_date: '2026-05-02T04:00:00Z',
          status: 'closed',
        }),
        createTrade({
          strategy: 'Breakout',
          entry_date: '2026-05-03T00:00:00Z',
          exit_date: '2026-05-03T12:00:00Z',
          status: 'closed',
        }),
      ]
      const stats = AnalyticsService.calculateDurationStats(trades)
      expect(stats.byStrategy['Pullback'].avgHoldTime).toBe(3)
      expect(stats.byStrategy['Pullback'].tradeCount).toBe(2)
      expect(stats.byStrategy['Breakout'].avgHoldTime).toBe(12)
    })
  })

  describe('calculateDurationDistribution', () => {
    it('should return empty distribution for no trades', () => {
      const dist = AnalyticsService.calculateDurationDistribution([])
      expect(dist.ranges).toHaveLength(5)
      expect(dist.ranges.every((r) => r.count === 0)).toBe(true)
    })

    it('should bucket trades by duration ranges', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-01T00:30:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-01T02:00:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-02T00:00:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-04T00:00:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-10T00:00:00Z',
          status: 'closed',
        }),
      ]
      const dist = AnalyticsService.calculateDurationDistribution(trades)
      expect(dist.ranges[0].count).toBe(1) // < 1 hour
      expect(dist.ranges[1].count).toBe(1) // 1-4 hours
      expect(dist.ranges[2].count).toBe(0) // 4-24 hours (empty, 24h goes to next bucket)
      expect(dist.ranges[3].count).toBe(2) // 1-7 days (24h and 72h trades)
      expect(dist.ranges[4].count).toBe(1) // > 7 days
    })

    it('should calculate correct percentages', () => {
      const trades = [
        createTrade({
          entry_date: '2026-05-01T00:00:00Z',
          exit_date: '2026-05-01T00:30:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-02T00:00:00Z',
          exit_date: '2026-05-02T00:30:00Z',
          status: 'closed',
        }),
        createTrade({
          entry_date: '2026-05-03T00:00:00Z',
          exit_date: '2026-05-03T12:00:00Z',
          status: 'closed',
        }),
      ]
      const dist = AnalyticsService.calculateDurationDistribution(trades)
      expect(dist.ranges[0].percentage).toBeCloseTo(66.67, 1) // 2/3
      expect(dist.ranges[2].percentage).toBeCloseTo(33.33, 1) // 1/3
    })
  })
})
