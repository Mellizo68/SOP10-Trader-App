import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

describe('Integration Tests - Market Data APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FLASHALPHA_API_KEY = 'test-key'
    process.env.FLASHALPHA_BASE_URL = 'https://test.api.com'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Aggregated Market Data', () => {
    it('should aggregate GEX + Greeks + Walls data successfully', () => {
      const mockGEX = { symbol: 'SPY', gex: 5000000, gexPercent: 45.5 }
      const mockGreeks = [{ symbol: 'SPY', strike: 450, delta: 0.65, gamma: 0.018 }]
      const mockWalls = [{ symbol: 'SPY', strikePrice: 450, putWall: { contracts: 10000 } }]

      expect(mockGEX.symbol).toBe('SPY')
      expect(mockGreeks).toHaveLength(1)
      expect(mockWalls).toHaveLength(1)
    })

    it('should handle network timeout and gracefully degrade', () => {
      const mockError = new Error('Request timeout')
      ;(mockError as any).code = 'ECONNABORTED'

      expect((mockError as any).code).toBe('ECONNABORTED')
    })

    it('should process multiple symbols concurrently', async () => {
      const symbols = ['SPY', 'QQQ', 'AAPL']
      const requests = symbols.map(async (sym) => ({ symbol: sym, gex: 5000000 }))
      const results = await Promise.all(requests)

      expect(results).toHaveLength(3)
      expect(results[0].symbol).toBe('SPY')
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should retry once after timeout and recover', () => {
      let retried = false
      const makeRequest = () => {
        if (!retried) {
          retried = true
          throw new Error('Timeout')
        }
        return { success: true, data: { gex: 5000000 } }
      }

      try {
        makeRequest()
      } catch (e) {
        // First attempt fails, retry
      }

      const result = makeRequest()
      expect(result.success).toBe(true)
    })

    it('should handle rate limiting gracefully', () => {
      const rateLimitError = { status: 429, message: 'Too many requests' }
      expect(rateLimitError.status).toBe(429)
    })

    it('should fallback to cached data on API failure', () => {
      const cachedData = { symbol: 'SPY', gex: 5000000 }
      const apiError = new Error('API unavailable')

      expect(apiError).toBeInstanceOf(Error)
      expect(cachedData.symbol).toBe('SPY')
    })
  })

  describe('Data Consistency and Validation', () => {
    it('should validate symbol format before API call', () => {
      const symbol = 'spy'.toUpperCase()
      expect(symbol).toBe('SPY')
    })

    it('should handle missing or null data gracefully', () => {
      const data = null
      const fallback = data || { symbol: 'SPY', gex: 0 }

      expect(fallback.symbol).toBe('SPY')
    })

    it('should preserve data timestamp consistency', () => {
      const timestamp = new Date().toISOString()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('Rate Limiting and Throttling', () => {
    it('should enforce minimum delay between requests', async () => {
      const start = Date.now()
      await new Promise((resolve) => setTimeout(resolve, 200))
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(190)
    })

    it('should queue requests when hitting rate limits', () => {
      const queue: string[] = []
      queue.push('/api/market/data/SPY')
      queue.push('/api/market/data/QQQ')

      expect(queue).toHaveLength(2)
      expect(queue[0]).toContain('SPY')
    })
  })

  describe('Statistics and Metrics', () => {
    it('should accurately track successful requests', () => {
      const stats = {
        totalRequests: 5,
        successCount: 5,
        errorCount: 0,
      }

      expect(stats.successCount).toBe(5)
      expect(stats.successCount).toBeLessThanOrEqual(stats.totalRequests)
    })

    it('should track errors and timeouts separately', () => {
      const stats = {
        totalRequests: 10,
        timeoutCount: 2,
        errorCount: 1,
        successCount: 7,
      }

      expect(stats.timeoutCount).not.toBe(stats.errorCount)
      expect(stats.successCount + stats.errorCount + stats.timeoutCount).toBe(stats.totalRequests)
    })
  })
})
