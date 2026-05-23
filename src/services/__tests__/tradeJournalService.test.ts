import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TradeJournalService } from '../tradeJournalService'
import { loadTrades, saveTrades } from '../../utils/localStorage'
import { apiClient } from '../../api/tradeClient'
import { TradeEntry } from '../../types'

// Mock dependencies
vi.mock('../../utils/localStorage')
vi.mock('../../api/tradeClient')

describe('TradeJournalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage functions
    vi.mocked(loadTrades).mockReturnValue([])
    vi.mocked(saveTrades).mockImplementation(() => {})
    // Mock API client methods - must return Promises
    vi.spyOn(apiClient, 'createTrade').mockResolvedValue({
      id: 'API-1',
      entryNumber: 1,
      status: 'open',
    } as TradeEntry)
    vi.spyOn(apiClient, 'updateTrade').mockResolvedValue({
      id: 'TRADE-0001',
      entryNumber: 1,
      symbol: 'SPY',
      strategy: 'Call Spread',
      entryPrice: 100,
      dateEntry: new Date(),
      status: 'open',
    } as TradeEntry)
    vi.spyOn(apiClient, 'closeTrade').mockResolvedValue({
      id: 'TRADE-0001',
      entryNumber: 1,
      symbol: 'SPY',
      strategy: 'Call Spread',
      entryPrice: 100,
      dateEntry: new Date(),
      status: 'closed',
      exitPrice: 110,
      exitDate: new Date(),
      profitLoss: 10,
      percentReturn: 10,
    } as TradeEntry)
    vi.spyOn(apiClient, 'deleteTrade').mockResolvedValue(true)
    vi.spyOn(apiClient, 'getTrades').mockResolvedValue([])
  })

  describe('createTrade', () => {
    it('should create a new trade with generated ID', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const tradeData = {
        symbol: 'SPY',
        strategy: 'Call Spread',
        entryPrice: 100,
        dateEntry: new Date('2026-05-22'),
      }

      const result = TradeJournalService.createTrade(tradeData as any)

      expect(result.id).toBe('TRADE-0001')
      expect(result.entryNumber).toBe(1)
      expect(result.status).toBe('open')
      expect(result.symbol).toBe('SPY')
    })

    it('should save trade to localStorage', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const tradeData = {
        symbol: 'QQQ',
        strategy: 'Put Spread',
        entryPrice: 50,
        dateEntry: new Date('2026-05-22'),
      }

      TradeJournalService.createTrade(tradeData as any)

      expect(saveTrades).toHaveBeenCalled()
    })

    it('should attempt API sync in background', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const tradeData = {
        symbol: 'SPY',
        strategy: 'Call Spread',
        entryPrice: 100,
        dateEntry: new Date('2026-05-22'),
      }

      TradeJournalService.createTrade(tradeData as any)

      expect(apiClient.createTrade).toHaveBeenCalled()
    })

    it('should handle API sync failure gracefully', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)
      vi.mocked(apiClient.createTrade).mockRejectedValue(
        new Error('Network error')
      )

      const tradeData = {
        symbol: 'SPY',
        strategy: 'Call Spread',
        entryPrice: 100,
        dateEntry: new Date('2026-05-22'),
      }

      // Should not throw even if API fails
      expect(() => {
        TradeJournalService.createTrade(tradeData as any)
      }).not.toThrow()
    })

    it('should increment entryNumber for multiple trades', () => {
      const existingTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(existingTrades)

      const tradeData = {
        symbol: 'QQQ',
        strategy: 'Put Spread',
        entryPrice: 50,
        dateEntry: new Date('2026-05-22'),
      }

      const result = TradeJournalService.createTrade(tradeData as any)

      expect(result.id).toBe('TRADE-0002')
      expect(result.entryNumber).toBe(2)
    })
  })

  describe('getTrade', () => {
    it('should return trade by ID', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.getTrade('TRADE-0001')

      expect(result).toBeDefined()
      expect(result?.symbol).toBe('SPY')
    })

    it('should return null for non-existent trade', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.getTrade('TRADE-0001')

      expect(result).toBeNull()
    })
  })

  describe('getAllTrades', () => {
    it('should return all trades from localStorage', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
        {
          id: 'TRADE-0002',
          entryNumber: 2,
          symbol: 'QQQ',
          strategy: 'Put Spread',
          entryPrice: 50,
          dateEntry: new Date(),
          status: 'closed',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)
      vi.mocked(apiClient.getTrades).mockResolvedValue([])

      const result = TradeJournalService.getAllTrades()

      expect(result).toHaveLength(2)
      expect(result[0].symbol).toBe('SPY')
      expect(result[1].symbol).toBe('QQQ')
    })

    it('should sync with API data if available', async () => {
      const localTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      const apiTrades: TradeEntry[] = [
        {
          id: 'API-TRADE-0001',
          entryNumber: 1,
          symbol: 'AAPL',
          strategy: 'Call Spread',
          entryPrice: 150,
          dateEntry: new Date(),
          status: 'open',
        },
      ]

      vi.mocked(loadTrades).mockReturnValue(localTrades)
      vi.mocked(apiClient.getTrades).mockResolvedValue(apiTrades)

      TradeJournalService.getAllTrades()

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(saveTrades).toHaveBeenCalledWith(apiTrades)
    })

    it('should handle empty API response gracefully', async () => {
      const localTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]

      vi.mocked(loadTrades).mockReturnValue(localTrades)
      vi.mocked(apiClient.getTrades).mockResolvedValue([])

      const result = TradeJournalService.getAllTrades()

      expect(result).toHaveLength(1) // Still has local trades
    })

    it('should handle API errors gracefully', async () => {
      const localTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]

      vi.mocked(loadTrades).mockReturnValue(localTrades)
      vi.mocked(apiClient.getTrades).mockRejectedValue(
        new Error('Network error')
      )

      const result = TradeJournalService.getAllTrades()

      // Should still return local trades on API error
      expect(result).toHaveLength(1)
    })
  })

  describe('updateTrade', () => {
    it('should update trade and save to localStorage', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.updateTrade('TRADE-0001', {
        status: 'closed',
      })

      expect(result?.status).toBe('closed')
      expect(saveTrades).toHaveBeenCalled()
    })

    it('should return null if trade not found', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.updateTrade('TRADE-0001', {
        status: 'closed',
      })

      expect(result).toBeNull()
    })

    it('should preserve trade ID and entryNumber', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.updateTrade('TRADE-0001', {
        symbol: 'QQQ',
      })

      expect(result?.id).toBe('TRADE-0001')
      expect(result?.entryNumber).toBe(1)
    })

    it('should attempt API sync after update', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      TradeJournalService.updateTrade('TRADE-0001', { status: 'closed' })

      expect(apiClient.updateTrade).toHaveBeenCalled()
    })
  })

  describe('closeTrade', () => {
    it('should close trade and calculate P&L', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const exitDate = new Date('2026-05-23')
      const result = TradeJournalService.closeTrade(
        'TRADE-0001',
        110,
        exitDate
      )

      expect(result?.status).toBe('closed')
      expect(result?.exitPrice).toBe(110)
      expect(result?.profitLoss).toBe(10) // 110 - 100
      expect(result?.percentReturn).toBeCloseTo(10) // (10/100)*100
    })

    it('should return null if trade not found', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.closeTrade(
        'TRADE-0001',
        110,
        new Date()
      )

      expect(result).toBeNull()
    })

    it('should handle loss scenarios correctly', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.closeTrade(
        'TRADE-0001',
        95,
        new Date()
      )

      expect(result?.profitLoss).toBe(-5)
      expect(result?.percentReturn).toBeCloseTo(-5)
    })

    it('should calculate P&L for small entry prices', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'PENNY',
          strategy: 'Long',
          entryPrice: 0.01,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const result = TradeJournalService.closeTrade(
        'TRADE-0001',
        0.02,
        new Date()
      )

      expect(result?.profitLoss).toBeCloseTo(0.01)
      expect(result?.percentReturn).toBeCloseTo(100) // 100% return
    })

    it('should attempt API sync after closing', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      TradeJournalService.closeTrade('TRADE-0001', 110, new Date())

      expect(apiClient.closeTrade).toHaveBeenCalled()
    })

    it('should set exitDate on closed trade', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date('2026-05-22'),
          status: 'open',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const exitDate = new Date('2026-05-23')
      const result = TradeJournalService.closeTrade(
        'TRADE-0001',
        110,
        exitDate
      )

      expect(result?.exitDate).toBe(exitDate)
    })
  })

  describe('deleteTrade', () => {
    it('should delete trade from localStorage', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
        {
          id: 'TRADE-0002',
          entryNumber: 2,
          symbol: 'QQQ',
          strategy: 'Put Spread',
          entryPrice: 50,
          dateEntry: new Date(),
          status: 'closed',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      TradeJournalService.deleteTrade('TRADE-0001')

      expect(saveTrades).toHaveBeenCalled()
      // Verify the trade was filtered out
      const savedCall = vi.mocked(saveTrades).mock.calls[0]
      expect(savedCall[0]).toHaveLength(1)
      expect(savedCall[0][0].id).toBe('TRADE-0002')
    })

    it('should handle deletion of non-existent trade gracefully', () => {
      const mockTrades: TradeEntry[] = []
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      // Should not throw even if trade not found
      expect(() => {
        TradeJournalService.deleteTrade('TRADE-0001')
      }).not.toThrow()
    })
  })

  describe('calculateStatistics', () => {
    it('should calculate correct statistics for trades', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          status: 'open',
        },
        {
          id: 'TRADE-0002',
          entryNumber: 2,
          symbol: 'QQQ',
          strategy: 'Put Spread',
          entryPrice: 50,
          dateEntry: new Date(),
          profitLoss: 10,
          percentReturn: 20,
          status: 'closed',
        },
      ]
      vi.mocked(loadTrades).mockReturnValue(mockTrades)

      const stats = TradeJournalService.calculateStatistics(mockTrades)

      expect(stats.totalTrades).toBe(2)
      expect(stats.winningTrades).toBe(1)
      expect(stats.losingTrades).toBe(0)
      expect(stats.winRate).toBeCloseTo(100)
    })

    it('should return zero statistics for no trades', () => {
      const stats = TradeJournalService.calculateStatistics([])

      expect(stats.totalTrades).toBe(0)
      expect(stats.winningTrades).toBe(0)
      expect(stats.losingTrades).toBe(0)
      expect(stats.winRate).toBe(0)
    })

    it('should calculate profit factor correctly', () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          entryPrice: 100,
          dateEntry: new Date(),
          profitLoss: 100,
          percentReturn: 100,
          status: 'closed',
        },
        {
          id: 'TRADE-0002',
          entryNumber: 2,
          symbol: 'QQQ',
          strategy: 'Put Spread',
          entryPrice: 50,
          dateEntry: new Date(),
          profitLoss: -50,
          percentReturn: -100,
          status: 'closed',
        },
      ]

      const stats = TradeJournalService.calculateStatistics(mockTrades)

      expect(stats.profitFactor).toBe(2) // 100 / 50
      expect(stats.totalProfitLoss).toBe(50)
    })
  })
})
