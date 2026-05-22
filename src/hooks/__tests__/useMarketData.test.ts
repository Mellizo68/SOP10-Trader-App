import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMarketData, MarketData } from '../useMarketData'

describe('useMarketData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally
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

    const { result } = renderHook(() => useMarketData('SPY'))

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
      '/api/market/data/QQQ',
      expect.any(Object)
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
      '/api/market/data/SPY',
      expect.any(Object)
    )
  })
})
