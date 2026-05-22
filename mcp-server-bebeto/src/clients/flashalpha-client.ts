import axios, { AxiosInstance } from 'axios'
import {
  GEXData,
  GreeksData,
  GammaFlipData,
  OptionsWallsData,
  VolumeOIData,
} from '../utils/types.js'

/**
 * FlashAlpha Client for MCP Server
 *
 * Wraps FlashAlpha API for real-time market data including:
 * - Gamma Exposure (GEX) data
 * - Greeks (Delta, Gamma, Theta, Vega, IV)
 * - Gamma flip levels and trends
 * - Options walls (Put/Call)
 * - Open Interest and Volume
 */
class FlashAlphaClient {
  private client: AxiosInstance
  private apiKey: string
  private baseUrl: string
  private requestCount = 0
  private rateLimitDelay = 200 // ms between requests
  private lastRequestTime = 0
  private readonly REQUEST_TIMEOUT = 10000 // 10 seconds
  private cache: Map<string, { data: unknown; expiry: number }> = new Map()

  constructor() {
    this.apiKey = process.env.FLASHALPHA_API_KEY || ''
    this.baseUrl = process.env.FLASHALPHA_BASE_URL || 'https://lab.flashalpha.com/api/v1'

    if (!this.apiKey) {
      console.warn(
        '⚠️ FlashAlpha API key not configured. Set FLASHALPHA_API_KEY environment variable.'
      )
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: this.REQUEST_TIMEOUT,
    })
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  /**
   * Simple in-memory cache with TTL
   */
  private getCached<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    if (item.expiry < Date.now()) {
      this.cache.delete(key)
      return null
    }
    return item.data as T
  }

  private setCached<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    })
  }

  /**
   * Get GEX (Gamma Exposure) data for a symbol
   */
  async getGEX(symbol: string, strike?: number): Promise<GEXData | null> {
    try {
      const cacheKey = `gex:${symbol}:${strike || 'all'}`
      const cached = this.getCached<GEXData>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      const params: any = { symbol: symbol.toUpperCase() }
      if (strike) params.strike = strike

      const response = await this.client.get('/gex', { params })

      if (response.status === 200 && response.data) {
        const gexData: GEXData = {
          symbol: response.data.symbol || symbol.toUpperCase(),
          strike: response.data.strike,
          gex: response.data.gex || 0,
          gexPercent: response.data.gexPercent || 0,
          gammaFlip: response.data.gammaFlip || false,
          regime: response.data.regime || 'neutral',
          timestamp: new Date().toISOString(),
        }

        this.setCached(cacheKey, gexData, 300) // 5 min cache
        return gexData
      }

      return null
    } catch (error) {
      console.error('❌ Error fetching GEX:', error instanceof Error ? error.message : error)
      return null
    }
  }

  /**
   * Get Greeks data for a symbol across all expirations
   */
  async getGreeks(symbol: string): Promise<GreeksData[]> {
    try {
      const cacheKey = `greeks:${symbol}`
      const cached = this.getCached<GreeksData[]>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      const response = await this.client.get(`/greeks/${symbol.toUpperCase()}`)

      if (response.status === 200 && Array.isArray(response.data)) {
        const greeksData = response.data.map((item: any) => ({
          symbol: item.symbol || symbol.toUpperCase(),
          strike: item.strike,
          expiration: item.expiration,
          optionType: item.type === 'call' ? 'call' : 'put',
          delta: item.delta || 0,
          gamma: item.gamma || 0,
          theta: item.theta || 0,
          vega: item.vega || 0,
          rho: item.rho || 0,
          iv: item.iv || 0,
          price: item.price || 0,
          timestamp: new Date().toISOString(),
        } as GreeksData))

        this.setCached(cacheKey, greeksData, 300)
        return greeksData
      }

      return []
    } catch (error) {
      console.error('❌ Error fetching Greeks:', error instanceof Error ? error.message : error)
      return []
    }
  }

  /**
   * Get Gamma Flip levels
   */
  async getGammaFlip(symbol: string): Promise<GammaFlipData | null> {
    try {
      const cacheKey = `gamma-flip:${symbol}`
      const cached = this.getCached<GammaFlipData>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      const response = await this.client.get(`/gamma-flip/${symbol.toUpperCase()}`)

      if (response.status === 200 && response.data) {
        const flipData: GammaFlipData = {
          symbol: response.data.symbol || symbol.toUpperCase(),
          flipLevel: response.data.flipLevel || 0,
          direction: response.data.direction || 'neutral',
          strength: response.data.strength || 0,
          confidence: response.data.confidence || 0,
          timestamp: new Date().toISOString(),
        }

        this.setCached(cacheKey, flipData, 300)
        return flipData
      }

      return null
    } catch (error) {
      console.error('❌ Error fetching Gamma Flip:', error instanceof Error ? error.message : error)
      return null
    }
  }

  /**
   * Get Options Walls (Put/Call wall strength)
   */
  async getOptionsWalls(symbol: string, strikePrice?: number): Promise<OptionsWallsData[]> {
    try {
      const cacheKey = `walls:${symbol}:${strikePrice || 'all'}`
      const cached = this.getCached<OptionsWallsData[]>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      const params: any = { symbol: symbol.toUpperCase() }
      if (strikePrice) params.strike = strikePrice

      const response = await this.client.get('/options-walls', { params })

      if (response.status === 200 && Array.isArray(response.data)) {
        const wallsData = response.data.map((item: any) => ({
          symbol: item.symbol || symbol.toUpperCase(),
          strikePrice: item.strikePrice || item.strike,
          putWall: {
            contracts: item.putWall?.contracts || 0,
            level: item.putWall?.level || 'weak',
          },
          callWall: {
            contracts: item.callWall?.contracts || 0,
            level: item.callWall?.level || 'weak',
          },
          timestamp: new Date().toISOString(),
        } as OptionsWallsData))

        this.setCached(cacheKey, wallsData, 300)
        return wallsData
      }

      return []
    } catch (error) {
      console.error('❌ Error fetching Options Walls:', error instanceof Error ? error.message : error)
      return []
    }
  }

  /**
   * Get Volume and Open Interest data
   */
  async getVolumeAndOI(symbol: string): Promise<VolumeOIData[]> {
    try {
      const cacheKey = `volume-oi:${symbol}`
      const cached = this.getCached<VolumeOIData[]>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      const response = await this.client.get(`/volume-oi/${symbol.toUpperCase()}`)

      if (response.status === 200 && Array.isArray(response.data)) {
        const volumeOIData = response.data.map((item: any) => ({
          symbol: item.symbol || symbol.toUpperCase(),
          strikePrice: item.strikePrice || item.strike,
          expiration: item.expiration,
          callOI: item.callOI || 0,
          callVolume: item.callVolume || 0,
          putOI: item.putOI || 0,
          putVolume: item.putVolume || 0,
          totalVolume: (item.callVolume || 0) + (item.putVolume || 0),
          timestamp: new Date().toISOString(),
        } as VolumeOIData))

        this.setCached(cacheKey, volumeOIData, 300)
        return volumeOIData
      }

      return []
    } catch (error) {
      console.error('❌ Error fetching Volume/OI:', error instanceof Error ? error.message : error)
      return []
    }
  }

  /**
   * Get all market data for a symbol
   */
  async getMarketData(symbol: string): Promise<{
    gex: GEXData | null
    gammaFlip: GammaFlipData | null
    greeks: GreeksData[]
    walls: OptionsWallsData[]
    volumeOI: VolumeOIData[]
  }> {
    try {
      const [gex, gammaFlip, greeks, walls, volumeOI] = await Promise.all([
        this.getGEX(symbol),
        this.getGammaFlip(symbol),
        this.getGreeks(symbol),
        this.getOptionsWalls(symbol),
        this.getVolumeAndOI(symbol),
      ])

      return {
        gex,
        gammaFlip,
        greeks: greeks || [],
        walls: walls || [],
        volumeOI: volumeOI || [],
      }
    } catch (error) {
      console.error('❌ Error getting market data:', error instanceof Error ? error.message : error)
      return {
        gex: null,
        gammaFlip: null,
        greeks: [],
        walls: [],
        volumeOI: [],
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.enforceRateLimit()
      const response = await this.client.get('/health')
      return response.status === 200
    } catch (error) {
      console.error(
        '❌ FlashAlpha health check failed:',
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Get API stats
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      cacheSize: this.cache.size,
      rateLimitDelay: this.rateLimitDelay,
      requestTimeout: this.REQUEST_TIMEOUT,
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

export const flashAlphaClient = new FlashAlphaClient()
export default FlashAlphaClient
