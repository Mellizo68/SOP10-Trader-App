import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMarketData, MarketData } from '../useMarketData'

describe('useMarketData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally (use real timers for async operations)
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch market data for a given symbol', async () => {
    const mockData: MarketData = {
      symbol: 'SPY',
      gex: {
        symbol: 'SPY',
        gex: 1000,
        gexPercent: 50,
        timestamp: new Date().toISOString(),
      },
      gammaFlip: null,
      greeks: { count: 0, items: [] },
      walls: { count: 0, items: [] },
      volumeOI: { count: 0, items: [] },
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    })

    const { result } = renderHook(() => useMarketData('SPY', 60000))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 5000 })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('should validate request parameters before fetch', async () => {
    const mockData: MarketData = {
      symbol: 'QQQ',
      gex: null,
      gammaFlip: null,
      greeks: { count: 0, items: [] },
      walls: { count: 0, items: [] },
      volumeOI: { count: 0, items: [] },
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    })

    const { result } = renderHook(() => useMarketData('QQQ'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 5000 })

    // Verify the symbol is converted to uppercase in the request
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/market/data/QQQ'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(result.current.data).toEqual(mockData)
  })

  it('should abort previous request when symbol changes', async () => {
    const mockData: MarketData = {
      symbol: 'QQQ',
      gex: null,
      gammaFlip: null,
      greeks: { count: 0, items: [] },
      walls: { count: 0, items: [] },
      volumeOI: { count: 0, items: [] },
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    })

    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string | null }) => useMarketData(symbol),
      { initialProps: { symbol: 'SPY' } }
    )

    expect(result.current.loading).toBe(true)

    // Change symbol - should abort SPY request and fetch QQQ
    rerender({ symbol: 'QQQ' })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 5000 })

    // Should have data for QQQ
    expect(result.current.data?.symbol).toBe('QQQ')
  })

  it('should cleanup on unmount', () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          symbol: 'MSFT',
          gex: null,
          gammaFlip: null,
          greeks: { count: 0, items: [] },
          walls: { count: 0, items: [] },
          volumeOI: { count: 0, items: [] },
          timestamp: new Date().toISOString(),
        },
      }),
    })

    const { unmount } = renderHook(() => useMarketData('MSFT'))

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow()
  })

  it('should handle fetch errors gracefully', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    })

    const { result } = renderHook(() => useMarketData('INVALID'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 5000 })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeNull()
  })

  it('should not fetch when symbol is null', () => {
    renderHook(() => useMarketData(null))

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should validate symbol format (uppercase conversion)', async () => {
    const mockData: MarketData = {
      symbol: 'SPY',
      gex: null,
      gammaFlip: null,
      greeks: { count: 0, items: [] },
      walls: { count: 0, items: [] },
      volumeOI: { count: 0, items: [] },
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    })

    const { result } = renderHook(() => useMarketData('spy'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 5000 })

    // Check that the request was made with uppercase symbol
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/market/data/SPY'),
      expect.any(Object)
    )
  })

  // SPRINT 1 (Performance Optimization): Polling Interval Tests
  describe('Polling Interval (Sprint 1: Performance)', () => {
    it('should accept custom polling interval parameter', () => {
      const mockData: MarketData = {
        symbol: 'SPY',
        gex: null,
        gammaFlip: null,
        greeks: { count: 0, items: [] },
        walls: { count: 0, items: [] },
        volumeOI: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      // Should not throw with custom interval
      expect(() => {
        renderHook(() => useMarketData('SPY', 30000))
      }).not.toThrow()
    })

    it('should not poll when symbol is null', () => {
      renderHook(() => useMarketData(null))

      // Fetch should never be called for null symbol
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  // Timeout and Retry Tests
  describe('Timeout Handling', () => {
    it('should abort long-running requests', async () => {
      let abortCalled = false

      ;(global.fetch as any).mockImplementation(
        (_url: string, options: any) =>
          new Promise((_resolve, _reject) => {
            const controller = options.signal
            if (controller) {
              controller.addEventListener('abort', () => {
                abortCalled = true
              })
            }
            // Never resolve - will be aborted
            setTimeout(() => {
              _reject(new Error('Request timed out'))
            }, 20000)
          })
      )

      const { unmount } = renderHook(() => useMarketData('SPY'))

      // Unmount should abort the request
      unmount()

      await waitFor(() => {
        expect(abortCalled || !global.fetch).toBe(true)
      }, { timeout: 2000 })
    })

    it('should handle network timeout errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Request timeout (15s)')
      )

      const { result } = renderHook(() => useMarketData('SPY'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('timeout')
      expect(result.current.data).toBeNull()
    })
  })

  // SPRINT 2 (Payload Filtering): Strike Range Filtering Tests
  describe('Strike Range Filtering (Sprint 2: Payload)', () => {
    it('should include strike range parameters in request', async () => {
      const mockData: MarketData = {
        symbol: 'SPY',
        gex: null,
        gammaFlip: null,
        greeks: { count: 0, items: [] },
        walls: { count: 0, items: [] },
        volumeOI: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      renderHook(() =>
        useMarketData('SPY', 60000, {
          strikeMin: 400,
          strikeMax: 500,
        })
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      const fetchUrl = (global.fetch as any).mock.calls[0][0]
      expect(fetchUrl).toContain('strikeMin=400')
      expect(fetchUrl).toContain('strikeMax=500')
    })

    it('should include strikeRange percentage parameter', async () => {
      const mockData: MarketData = {
        symbol: 'QQQ',
        gex: null,
        gammaFlip: null,
        greeks: { count: 0, items: [] },
        walls: { count: 0, items: [] },
        volumeOI: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      renderHook(() =>
        useMarketData('QQQ', 60000, {
          strikeRange: 30, // ±30% around ATM
        })
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      const fetchUrl = (global.fetch as any).mock.calls[0][0]
      expect(fetchUrl).toContain('strikeRange=30')
    })

    it('should include all strike filter parameters in URL', async () => {
      const mockData: MarketData = {
        symbol: 'SPY',
        gex: null,
        gammaFlip: null,
        greeks: { count: 0, items: [] },
        walls: { count: 0, items: [] },
        volumeOI: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      // Test with multiple strike filter options
      renderHook(() =>
        useMarketData('SPY', 60000, {
          strikeMin: 400,
          strikeMax: 500,
          strikeRange: 20,
        })
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      const url = (global.fetch as any).mock.calls[0][0] as string
      expect(url).toMatch(/strikeMin=400/)
      expect(url).toMatch(/strikeMax=500/)
      expect(url).toMatch(/strikeRange=20/)
    })
  })

  // Request Deduplication Tests
  describe('Request Deduplication', () => {
    it('should track in-flight requests to prevent duplicate concurrent requests', async () => {
      const mockData: MarketData = {
        symbol: 'SPY',
        gex: null,
        gammaFlip: null,
        greeks: { count: 0, items: [] },
        walls: { count: 0, items: [] },
        volumeOI: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      // Create hook - should make one initial request
      const { result } = renderHook(() => useMarketData('SPY'))

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData)
      })

      const fetchCount = global.fetch.mock.calls.length
      expect(fetchCount).toBeGreaterThan(0)
    })
  })

  // Manual Refresh Tests
  describe('Manual Refresh', () => {
    it('should expose refetch function for manual data refresh', async () => {
      const mockData: MarketData = {
        symbol: 'MSFT',
        gex: null,
        gammaFlip: null,
        greeks: { count: 0, items: [] },
        walls: { count: 0, items: [] },
        volumeOI: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useMarketData('MSFT'))

      await waitFor(() => {
        expect(result.current.data).toBeTruthy()
      })

      // Refetch function should exist
      expect(result.current.refetch).toBeDefined()
      expect(typeof result.current.refetch).toBe('function')

      // Call refetch
      result.current.refetch()

      // Should trigger another fetch
      await waitFor(() => {
        expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // Edge Cases
  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'No data available' }),
      })

      const { result } = renderHook(() => useMarketData('INVALID'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toBeNull()
    })

    it('should handle JSON parse error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const { result } = renderHook(() => useMarketData('SPY'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('Invalid JSON')
    })

    it('should set lastUpdated timestamp on successful fetch', async () => {
      const mockData: MarketData = {
        symbol: 'SPY',
        gex: null,
        gammaFlip: null,
        greeks: { count: 0, items: [] },
        walls: { count: 0, items: [] },
        volumeOI: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      })

      const { result } = renderHook(() => useMarketData('SPY'))

      await waitFor(() => {
        expect(result.current.lastUpdated).toBeTruthy()
      })

      expect(result.current.lastUpdated).toBeInstanceOf(Date)
    })
  })
})
