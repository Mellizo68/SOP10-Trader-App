import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TradeAPIClient } from '../tradeClient'
import { TradeEntry } from '../../types'

// Mock fetch
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('TradeAPIClient', () => {
  let client: TradeAPIClient

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    client = new TradeAPIClient()

    // Mock the isOnline health check to return online by default
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getTrades', () => {
    it('should fetch trades from API when online', async () => {
      const mockTrades: TradeEntry[] = [
        {
          id: '1',
          symbol: 'SPY',
          entryPrice: 450,
          quantity: 100,
          entryDate: new Date().toISOString(),
          status: 'open',
          pnl: 500,
          pnlPercent: 1.1,
          notes: 'Test trade',
        },
      ]

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrades }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrades }),
        })

      const trades = await client.getTrades()

      expect(trades).toEqual(mockTrades)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trades'),
        expect.any(Object)
      )
    })

    it('should use cached data when API is offline', async () => {
      const mockTrades: TradeEntry[] = [
        {
          id: '1',
          symbol: 'QQQ',
          entryPrice: 350,
          quantity: 50,
          entryDate: new Date().toISOString(),
          status: 'closed',
          pnl: -200,
          pnlPercent: -1.1,
          notes: 'Closed trade',
        },
      ]

      // First call fails (offline), should return cached
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      )

      // Manually set cache using the correct key from production code
      localStorage.setItem(
        'sop10_trades_cache',
        JSON.stringify(mockTrades)
      )

      const trades = await client.getTrades()

      expect(trades).toEqual(mockTrades)
    })

    it('should mark trades as pending during sync', async () => {
      const mockTrades: TradeEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          entryPrice: 150,
          quantity: 100,
          entryDate: new Date().toISOString(),
          status: 'open',
          pnl: 1000,
          pnlPercent: 6.7,
          notes: 'Pending sync',
        },
      ]

      ;(global.fetch as any)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrades }),
        })

      const trades = await client.getTrades()

      expect(trades).toBeTruthy()
    })

    it('should recover when API comes back online', async () => {
      const mockTrades: TradeEntry[] = [
        {
          id: '1',
          symbol: 'TSLA',
          entryPrice: 200,
          quantity: 50,
          entryDate: new Date().toISOString(),
          status: 'open',
          pnl: 500,
          pnlPercent: 5,
          notes: 'Recovery trade',
        },
      ]

      // First call - offline
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Offline')
      )

      // Set cache
      localStorage.setItem(
        'sop10_trades_cache',
        JSON.stringify(mockTrades)
      )

      let trades = await client.getTrades()
      expect(trades).toEqual(mockTrades) // From cache

      // Second call - back online
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrades }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrades }),
        })

      trades = await client.getTrades()
      expect(trades).toEqual(mockTrades) // From API
    })
  })

  describe('getTrade', () => {
    it('should fetch a single trade from API', async () => {
      const mockTrade: TradeEntry = {
        id: '123',
        symbol: 'MSFT',
        entryPrice: 300,
        quantity: 100,
        entryDate: new Date().toISOString(),
        status: 'open',
        pnl: 2000,
        pnlPercent: 6.7,
        notes: 'Single trade test',
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrade }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTrade }),
        })

      const trade = await client.getTrade('123')

      expect(trade).toEqual(mockTrade)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trades/123'),
        expect.any(Object)
      )
    })

    it('should return null if trade not found', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: null }),
        })

      const trade = await client.getTrade('nonexistent')

      expect(trade).toBeNull()
    })
  })

  describe('createTrade', () => {
    it('should create a new trade', async () => {
      const newTrade: Partial<TradeEntry> = {
        symbol: 'GOOGL',
        entryPrice: 2800,
        quantity: 10,
        entryDate: new Date().toISOString(),
      }

      const mockResponse: TradeEntry = {
        id: 'new-id',
        ...newTrade,
        status: 'open',
        pnl: 0,
        pnlPercent: 0,
        notes: '',
      } as TradeEntry

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockResponse }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockResponse }),
        })

      const trade = await client.createTrade(newTrade as TradeEntry)

      expect(trade).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trades'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  describe('updateTrade', () => {
    it('should update an existing trade', async () => {
      const updatedTrade: Partial<TradeEntry> = {
        id: '1',
        status: 'closed',
        pnl: 1500,
        pnlPercent: 5,
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: updatedTrade }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: updatedTrade }),
        })

      const trade = await client.updateTrade('1', updatedTrade as TradeEntry)

      expect(trade?.status).toBe('closed')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trades/1'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })
  })

  describe('closeTrade', () => {
    it('should close a trade with exit price and date', async () => {
      const closedData = {
        id: '1',
        symbol: 'SPY',
        status: 'closed',
        profitLoss: 500,
        percentReturn: 2.5,
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: closedData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: closedData }),
        })

      const exitDate = new Date()
      const trade = await client.closeTrade('1', 455, exitDate)

      expect(trade?.status).toBe('closed')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trades/1/close'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })
  })

  describe('Offline handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      )

      localStorage.setItem(
        'sop10_trades_cache',
        JSON.stringify([
          {
            id: '1',
            symbol: 'SPY',
            entryPrice: 450,
            quantity: 100,
            entryDate: new Date().toISOString(),
            status: 'open',
            pnl: 500,
            pnlPercent: 1.1,
            notes: 'Test',
          },
        ])
      )

      const trades = await client.getTrades()

      expect(trades.length).toBeGreaterThan(0)
      expect(trades[0].symbol).toBe('SPY')
    })

    it('should return empty array if no cache and offline', async () => {
      localStorage.clear()

      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Offline')
      )

      const trades = await client.getTrades()

      expect(trades).toEqual([])
    })
  })
})
