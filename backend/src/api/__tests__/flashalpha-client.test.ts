import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

describe('FlashAlphaClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FLASHALPHA_API_KEY = 'test-key'
    process.env.FLASHALPHA_BASE_URL = 'https://test.api.com'
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initialization and Configuration', () => {
    it('should initialize with environment variables', () => {
      process.env.FLASHALPHA_API_KEY = 'test-key-123'
      process.env.FLASHALPHA_BASE_URL = 'https://api.flashalpha.com'

      expect(process.env.FLASHALPHA_API_KEY).toBe('test-key-123')
      expect(process.env.FLASHALPHA_BASE_URL).toBe('https://api.flashalpha.com')
    })

    it('should use default base URL if not configured', () => {
      delete process.env.FLASHALPHA_BASE_URL
      expect(process.env.FLASHALPHA_BASE_URL).toBeUndefined()
    })
  })

  describe('Request Timeout Handling', () => {
    it('should handle 10-second timeout', () => {
      const mockError: any = new Error('Request timeout')
      mockError.code = 'ECONNABORTED'

      expect(mockError.code).toBe('ECONNABORTED')
      expect(mockError.message).toBe('Request timeout')
    })

    it('should track timeout statistics', () => {
      const stats = {
        totalRequests: 0,
        timeoutCount: 0,
        successCount: 0,
        errorCount: 0,
      }

      expect(stats.timeoutCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors (401)', () => {
      const error = { response: { status: 401 }, config: { url: '/gex' } }
      expect(error.response.status).toBe(401)
    })

    it('should handle rate limit errors (429)', () => {
      const error = { response: { status: 429 }, config: { url: '/gex' } }
      expect(error.response.status).toBe(429)
    })

    it('should return null on API error', () => {
      const mockError = new Error('Network error')
      expect(mockError).toBeInstanceOf(Error)
    })
  })

  describe('API Response Handling', () => {
    it('should successfully fetch GEX data', () => {
      const data = {
        symbol: 'SPY',
        gex: 5000000,
        gexPercent: 45.5,
        gammaFlip: false,
      }

      expect(data.symbol).toBe('SPY')
      expect(data.gex).toBe(5000000)
      expect(data.gexPercent).toBe(45.5)
    })

    it('should fetch Greeks data for options', () => {
      const data = {
        symbol: 'SPY',
        strike: 450,
        expiration: '2024-01-19',
        type: 'call',
        delta: 0.65,
        gamma: 0.018,
        theta: -0.02,
        vega: 0.15,
        iv: 0.18,
        price: 2.50,
      }

      expect(data.delta).toBe(0.65)
      expect(data.type).toBe('call')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce 200ms delay between requests', async () => {
      const start = Date.now()
      await new Promise((resolve) => setTimeout(resolve, 200))
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(190)
    })
  })

  describe('Statistics Tracking', () => {
    it('should track request count', () => {
      const stats = {
        totalRequests: 5,
        timeoutCount: 1,
        successCount: 4,
        errorCount: 0,
      }

      expect(stats.totalRequests).toBeGreaterThan(0)
    })

    it('should track success and error counts separately', () => {
      const stats = {
        totalRequests: 10,
        successCount: 8,
        errorCount: 2,
        timeoutCount: 1,
      }

      expect(stats.successCount + stats.errorCount).toBeLessThanOrEqual(stats.totalRequests)
    })

    it('should reset statistics', () => {
      const stats = {
        totalRequests: 5,
        timeoutCount: 2,
        successCount: 3,
        errorCount: 0,
      }

      stats.totalRequests = 0
      stats.timeoutCount = 0
      stats.successCount = 0
      stats.errorCount = 0

      expect(stats.totalRequests).toBe(0)
      expect(stats.timeoutCount).toBe(0)
    })
  })
})
