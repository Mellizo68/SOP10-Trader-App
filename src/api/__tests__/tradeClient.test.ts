import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TradeAPIClient } from '../tradeClient'
import { TradeEntry } from '../../types'

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

describe('TradeAPIClient', () => {
  let client: TradeAPIClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    client = new TradeAPIClient()
    fetchMock = vi.fn()
    global.fetch = fetchMock
    vi.clearAllMocks()
    ;(global.localStorage.getItem as any).mockReturnValue(null)
    ;(global.localStorage.setItem as any).mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getTrades', () => {
    it('should fetch trades from API when online', async () => {
      const mockTrades: TradeEntry[] = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          strikePrice: 400,
          delta: 0.5,
          daysToExpiration: 30,
          ivPercent: 20,
          gexStatus: 'positivo',
          pvpStatus: 'bullish',
          vwapStatus: 'above',
          confluenceScore: 75,
          entryPrice: 100,
          takeProfit: 110,
          stopLoss: 90,
          dateEntry: new Date(),
          status: 'open',
          comments: 'Test trade',
          screenshots: [],
        },
      ]

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrades }),
        }) // getTrades

      const result = await client.getTrades()

      expect(result).toEqual(mockTrades)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should use cached data when offline', async () => {
      const cachedTrades = [
        {
          id: 'TRADE-0001',
          entryNumber: 1,
          symbol: 'SPY',
          strategy: 'Call Spread',
          strikePrice: 400,
          delta: 0.5,
          daysToExpiration: 30,
          ivPercent: 20,
          gexStatus: 'positivo',
          pvpStatus: 'bullish',
          vwapStatus: 'above',
          confluenceScore: 75,
          entryPrice: 100,
          takeProfit: 110,
          stopLoss: 90,
          dateEntry: '2026-05-22T23:59:35.444Z',
          status: 'open',
          comments: 'Cached trade',
          screenshots: [],
        },
      ]

      ;(global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify(cachedTrades)
      )
      fetchMock.mockResolvedValue({ ok: false }) // offline

      const result = await client.getTrades()

      expect(result).toEqual(cachedTrades)
    })

    it('should support filtering by status', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })

      await client.getTrades({ status: 'closed', limit: 50, offset: 0 })

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('status=closed'),
        expect.any(Object)
      )
    })

    it('should handle API errors gracefully', async () => {
      const cachedTrades = []
      ;(global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify(cachedTrades)
      )
      fetchMock.mockRejectedValue(new Error('Network error'))

      const result = await client.getTrades()

      expect(result).toEqual(cachedTrades)
    })
  })

  describe('getTrade', () => {
    it('should fetch single trade from API', async () => {
      const mockTrade: TradeEntry = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        status: 'open',
        comments: 'Test trade',
        screenshots: [],
      }

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrade }),
        })

      const result = await client.getTrade('TRADE-0001')

      expect(result).toEqual(mockTrade)
    })

    it('should return null for non-existent trade', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({ ok: false }) // trade not found

      const result = await client.getTrade('TRADE-NOTFOUND')

      expect(result).toBeNull()
    })

    it('should use cache when offline', async () => {
      const cachedTrade = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: '2026-05-22T23:59:35.451Z',
        status: 'open',
        comments: 'Cached trade',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify([cachedTrade])
      )
      fetchMock.mockResolvedValue({ ok: false })

      const result = await client.getTrade('TRADE-0001')

      expect(result).toEqual(cachedTrade)
    })
  })

  describe('createTrade', () => {
    it('should create trade via API when online', async () => {
      const newTradeData = {
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo' as const,
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        comments: 'New trade',
        screenshots: [],
      }

      const createdTrade: TradeEntry = {
        ...newTradeData,
        id: 'TRADE-0001',
        entryNumber: 1,
        status: 'open',
      }

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: createdTrade }),
        })

      const result = await client.createTrade(newTradeData)

      expect(result).toEqual(createdTrade)
      expect(global.localStorage.setItem).toHaveBeenCalled()
    })

    it('should create trade locally when offline', async () => {
      const newTradeData = {
        symbol: 'QQQ',
        strategy: 'Put Spread',
        strikePrice: 300,
        delta: -0.5,
        daysToExpiration: 45,
        ivPercent: 25,
        gexStatus: 'negativo' as const,
        pvpStatus: 'bearish',
        vwapStatus: 'below',
        confluenceScore: 85,
        entryPrice: 200,
        takeProfit: 190,
        stopLoss: 210,
        dateEntry: new Date(),
        comments: 'Offline trade',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any).mockReturnValue(JSON.stringify([]))
      fetchMock.mockResolvedValue({ ok: false })

      const result = await client.createTrade(newTradeData)

      expect(result.id).toMatch(/^TRADE-\d{4}$/)
      expect(result.symbol).toBe('QQQ')
      expect(result.status).toBe('open')
    })
  })

  describe('updateTrade', () => {
    it('should update trade via API', async () => {
      const updatedTrade: TradeEntry = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.55,
        daysToExpiration: 29,
        ivPercent: 21,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 78,
        entryPrice: 100,
        takeProfit: 112,
        stopLoss: 88,
        dateEntry: new Date(),
        status: 'open',
        comments: 'Updated',
        screenshots: [],
      }

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: updatedTrade }),
        })

      const result = await client.updateTrade('TRADE-0001', { takeProfit: 112 })

      expect(result).toEqual(updatedTrade)
    })

    it('should return null if trade not found', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({ ok: false })

      const result = await client.updateTrade('TRADE-NOTFOUND', {})

      expect(result).toBeNull()
    })

    it('should update locally when offline', async () => {
      const existingTrade: TradeEntry = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        status: 'open',
        comments: 'Original',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify([existingTrade])
      )
      fetchMock.mockResolvedValue({ ok: false })

      const result = await client.updateTrade('TRADE-0001', { takeProfit: 120 })

      expect(result?.takeProfit).toBe(120)
    })
  })

  describe('closeTrade', () => {
    it('should close trade and calculate P&L', async () => {
      const closedTrade: TradeEntry = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date('2026-05-22'),
        status: 'closed',
        exitPrice: 110,
        exitDate: new Date('2026-05-23'),
        profitLoss: 10,
        percentReturn: 10,
        comments: 'Closed',
        screenshots: [],
      }

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: closedTrade }),
        })

      const result = await client.closeTrade('TRADE-0001', 110, new Date('2026-05-23'))

      expect(result?.status).toBe('closed')
      expect(result?.exitPrice).toBe(110)
    })

    it('should close locally when offline', async () => {
      const existingTrade: TradeEntry = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        status: 'open',
        comments: 'To close',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify([existingTrade])
      )
      fetchMock.mockResolvedValue({ ok: false })

      const exitDate = new Date('2026-05-23')
      const result = await client.closeTrade('TRADE-0001', 110, exitDate)

      expect(result?.status).toBe('closed')
      expect(result?.profitLoss).toBe(10)
      expect(result?.percentReturn).toBeCloseTo(10)
    })
  })

  describe('deleteTrade', () => {
    it('should delete trade via API', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({ ok: true }) // delete

      const result = await client.deleteTrade('TRADE-0001')

      expect(result).toBe(true)
    })

    it('should return false if delete fails', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({ ok: false })

      const result = await client.deleteTrade('TRADE-NOTFOUND')

      expect(result).toBe(false)
    })

    it('should delete locally when offline', async () => {
      const existingTrade: TradeEntry = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        status: 'open',
        comments: 'To delete',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify([existingTrade])
      )
      fetchMock.mockResolvedValue({ ok: false })

      const result = await client.deleteTrade('TRADE-0001')

      expect(result).toBe(true)
      expect(global.localStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('getStatistics', () => {
    it('should fetch statistics from API', async () => {
      const mockStats = {
        totalTrades: 10,
        winningTrades: 7,
        losingTrades: 3,
        winRate: 70,
        averageProfit: 50,
        averageLoss: 30,
        profitFactor: 1.67,
        totalProfitLoss: 230,
        bestTrade: 150,
        worstTrade: -100,
        byStrategy: {},
        byConfluenceScore: {
          high: { winRate: 80, avgProfit: 75 },
          medium: { winRate: 60, avgProfit: 40 },
          low: { winRate: 40, avgProfit: 10 },
        },
      }

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockStats }),
        })

      const result = await client.getStatistics()

      expect(result).toEqual(mockStats)
    })

    it('should return null if API fails', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({ ok: false })

      const result = await client.getStatistics()

      expect(result).toBeNull()
    })

    it('should calculate stats locally when offline', async () => {
      const closedTrade: TradeEntry = {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        status: 'closed',
        exitPrice: 110,
        profitLoss: 10,
        percentReturn: 10,
        comments: 'Closed',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify([closedTrade])
      )
      fetchMock.mockResolvedValue({ ok: false })

      const result = await client.getStatistics()

      expect(result).not.toBeNull()
      expect(result?.totalTrades).toBe(1)
      expect(result?.winningTrades).toBe(1)
    })
  })

  describe('syncLocalStorageToAPI', () => {
    it('should sync pending trades to API', async () => {
      const pendingTrade: TradeEntry = {
        id: 'TRADE-PENDING',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        status: 'open',
        comments: 'Pending sync',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any)
        .mockReturnValueOnce(JSON.stringify(['TRADE-PENDING'])) // pending syncs
        .mockReturnValueOnce(JSON.stringify([pendingTrade])) // trades cache

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({ ok: true }) // sync POST

      const result = await client.syncLocalStorageToAPI()

      expect(result.synced).toBe(1)
      expect(result.errors).toBe(0)
    })

    it('should skip sync when offline', async () => {
      fetchMock.mockResolvedValue({ ok: false })

      const result = await client.syncLocalStorageToAPI()

      expect(result.synced).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should handle sync errors gracefully', async () => {
      const pendingTrade: TradeEntry = {
        id: 'TRADE-PENDING',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: new Date(),
        status: 'open',
        comments: 'Pending',
        screenshots: [],
      }

      ;(global.localStorage.getItem as any)
        .mockReturnValueOnce(JSON.stringify(['TRADE-PENDING']))
        .mockReturnValueOnce(JSON.stringify([pendingTrade]))

      fetchMock
        .mockResolvedValueOnce({ ok: true }) // health
        .mockResolvedValueOnce({ ok: false }) // sync fails

      const result = await client.syncLocalStorageToAPI()

      expect(result.synced).toBe(0)
      expect(result.errors).toBe(1)
    })
  })
})
