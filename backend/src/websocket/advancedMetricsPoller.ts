import { thetaDataClient } from '../api/thetadata-client'
import { flashAlphaClient } from '../api/flashalpha-client'
import logger from '../utils/logger'
import { cache } from '../utils/cache'

export interface OrderFlow {
  timestamp: number
  netDeltaFlow: number
  callDeltaFlow: number
  putDeltaFlow: number
  buyPressure: number
  sellPressure: number
  netFlow: number
}

export interface VolatilityTermStructure {
  expirationDate: string
  iv: number
  daysToExpiration: number
}

export interface VolatilitySkew {
  strikePrice: number
  callIV: number
  putIV: number
  skewDifference: number
}

export interface Level2OrderBook {
  bids: Array<{ price: number; volume: number }>
  asks: Array<{ price: number; volume: number }>
}

export interface AdvancedMetricsUpdate {
  symbol: string
  timestamp: number
  orderFlow?: OrderFlow
  volatilityTermStructure?: VolatilityTermStructure[]
  volatilitySkew?: VolatilitySkew[]
  level2OrderBook?: Level2OrderBook
}

export interface AdvancedMetricsCallback {
  onUpdate: (update: AdvancedMetricsUpdate) => void
  onError: (symbol: string, error: Error) => void
}

export class AdvancedMetricsPoller {
  private symbol: string
  private pollers: Map<string, NodeJS.Timeout> = new Map()
  private callbacks: AdvancedMetricsCallback
  private updateBuffer: Partial<AdvancedMetricsUpdate> = {}
  private bufferFlushInterval: number = 100 // volatile data: 100ms
  private bufferTimer: NodeJS.Timeout | null = null
  private pollInterval: number = 500 // 0.5s between ThetaData calls
  private stableDataPollInterval: number = 5000 // 5s for stable data (vol term structure)

  constructor(symbol: string, callbacks: AdvancedMetricsCallback) {
    this.symbol = symbol
    this.callbacks = callbacks
  }

  start(): void {
    const pollerKey = `${this.symbol}-advanced-active`
    if (this.pollers.has(pollerKey)) {
      return // Already polling
    }

    logger.info(`[AdvancedMetrics] Starting poller for ${this.symbol}`)

    // Poll volatile data: Order Flow & Level 2 (100ms flush)
    const volatilePoller = setInterval(async () => {
      try {
        await this.fetchOrderFlow()
        await this.fetchLevel2OrderBook()
        this.scheduleFlush()
      } catch (error) {
        logger.warn(`[AdvancedMetrics] Volatile data poll error for ${this.symbol}:`, error)
        this.callbacks.onError(this.symbol, error as Error)
      }
    }, this.pollInterval)

    // Poll stable data: Vol Term Structure & Skew (5s interval)
    const stablePoller = setInterval(async () => {
      try {
        await this.fetchVolatilityTermStructure()
        await this.fetchVolatilitySkew()
        this.scheduleFlush()
      } catch (error) {
        logger.warn(`[AdvancedMetrics] Stable data poll error for ${this.symbol}:`, error)
        this.callbacks.onError(this.symbol, error as Error)
      }
    }, this.stableDataPollInterval)

    this.pollers.set(`${this.symbol}-volatile`, volatilePoller)
    this.pollers.set(`${this.symbol}-stable`, stablePoller)
    this.pollers.set(pollerKey, true as any)
  }

  private async fetchOrderFlow(): Promise<void> {
    try {
      const cacheKey = `advanced-metrics:${this.symbol}:order-flow`

      // Try to get options chain data from cache or API
      const chain = await this.getOptionsChainCached()
      if (!chain || chain.length === 0) {
        logger.debug(`[AdvancedMetrics] No options chain data for order flow: ${this.symbol}`)
        return
      }

      // Calculate order flow from Greeks
      const callDelta = chain
        .filter(opt => opt.optionType === 'CALL')
        .reduce((sum, opt) => sum + ((opt.delta || 0) * (opt.volume || 0)), 0)

      const putDelta = chain
        .filter(opt => opt.optionType === 'PUT')
        .reduce((sum, opt) => sum + (Math.abs(opt.delta || 0) * (opt.volume || 0)), 0)

      const totalVolume = chain.reduce((sum, opt) => sum + (opt.volume || 0), 0)
      const buyPressure = totalVolume > 0 ? ((callDelta / totalVolume) * 100) : 0
      const sellPressure = totalVolume > 0 ? ((putDelta / totalVolume) * 100) : 0

      this.updateBuffer.orderFlow = {
        timestamp: Date.now(),
        netDeltaFlow: callDelta - putDelta,
        callDeltaFlow: callDelta,
        putDeltaFlow: putDelta,
        buyPressure: Math.max(0, Math.min(100, buyPressure)),
        sellPressure: Math.max(0, Math.min(100, sellPressure)),
        netFlow: totalVolume
      }

      cache.set(cacheKey, this.updateBuffer.orderFlow, 60)
    } catch (error) {
      logger.warn(`[AdvancedMetrics] fetchOrderFlow error for ${this.symbol}:`, error)
    }
  }

  private async fetchVolatilityTermStructure(): Promise<void> {
    try {
      const cacheKey = `advanced-metrics:${this.symbol}:vol-term-structure`

      const chain = await this.getOptionsChainCached()
      if (!chain || chain.length === 0) {
        logger.debug(`[AdvancedMetrics] No options chain data for vol term: ${this.symbol}`)
        return
      }

      // Group by expiration and calculate IV by term
      const expirationMap = new Map<string, { iv: number[]; dte: number }>()

      chain.forEach(opt => {
        if (opt.iv !== undefined && opt.expirationDate) {
          const dte = this.calculateDTE(opt.expirationDate)
          if (!expirationMap.has(opt.expirationDate)) {
            expirationMap.set(opt.expirationDate, { iv: [], dte })
          }
          expirationMap.get(opt.expirationDate)!.iv.push(opt.iv)
        }
      })

      const termStructure: VolatilityTermStructure[] = Array.from(expirationMap.entries())
        .map(([expDate, data]) => ({
          expirationDate: expDate,
          iv: data.iv.length > 0 ? data.iv.reduce((a, b) => a + b) / data.iv.length : 0,
          daysToExpiration: data.dte
        }))
        .sort((a, b) => a.daysToExpiration - b.daysToExpiration)

      if (termStructure.length > 0) {
        this.updateBuffer.volatilityTermStructure = termStructure
        cache.set(cacheKey, termStructure, 300)
      }
    } catch (error) {
      logger.warn(`[AdvancedMetrics] fetchVolatilityTermStructure error for ${this.symbol}:`, error)
    }
  }

  private async fetchVolatilitySkew(): Promise<void> {
    try {
      const cacheKey = `advanced-metrics:${this.symbol}:vol-skew`

      const chain = await this.getOptionsChainCached()
      if (!chain || chain.length === 0) {
        logger.debug(`[AdvancedMetrics] No options chain data for vol skew: ${this.symbol}`)
        return
      }

      // Group by strike and calculate skew
      const strikeMap = new Map<number, { callIV: number[]; putIV: number[] }>()

      chain.forEach(opt => {
        if (opt.iv !== undefined && opt.strikePrice !== undefined) {
          if (!strikeMap.has(opt.strikePrice)) {
            strikeMap.set(opt.strikePrice, { callIV: [], putIV: [] })
          }
          const data = strikeMap.get(opt.strikePrice)!
          if (opt.optionType === 'CALL') {
            data.callIV.push(opt.iv)
          } else if (opt.optionType === 'PUT') {
            data.putIV.push(opt.iv)
          }
        }
      })

      const skew: VolatilitySkew[] = Array.from(strikeMap.entries())
        .map(([strike, data]) => {
          const avgCallIV = data.callIV.length > 0 ? data.callIV.reduce((a, b) => a + b) / data.callIV.length : 0
          const avgPutIV = data.putIV.length > 0 ? data.putIV.reduce((a, b) => a + b) / data.putIV.length : 0
          return {
            strikePrice: strike,
            callIV: avgCallIV,
            putIV: avgPutIV,
            skewDifference: avgPutIV - avgCallIV
          }
        })
        .sort((a, b) => a.strikePrice - b.strikePrice)

      if (skew.length > 0) {
        this.updateBuffer.volatilitySkew = skew
        cache.set(cacheKey, skew, 300)
      }
    } catch (error) {
      logger.warn(`[AdvancedMetrics] fetchVolatilitySkew error for ${this.symbol}:`, error)
    }
  }

  private async fetchLevel2OrderBook(): Promise<void> {
    try {
      const cacheKey = `advanced-metrics:${this.symbol}:level2`

      const chain = await this.getOptionsChainCached()
      if (!chain || chain.length === 0) {
        logger.debug(`[AdvancedMetrics] No options chain data for level2: ${this.symbol}`)
        return
      }

      // Extract bid/ask levels from options chain (using strike prices as proxies)
      const bids = chain
        .filter(opt => opt.bid !== undefined && opt.bid > 0)
        .map(opt => ({ price: opt.bid as number, volume: opt.bidSize || 1 }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 10)

      const asks = chain
        .filter(opt => opt.ask !== undefined && opt.ask > 0)
        .map(opt => ({ price: opt.ask as number, volume: opt.askSize || 1 }))
        .sort((a, b) => a.price - b.price)
        .slice(0, 10)

      if (bids.length > 0 || asks.length > 0) {
        this.updateBuffer.level2OrderBook = { bids, asks }
        cache.set(cacheKey, this.updateBuffer.level2OrderBook, 60)
      }
    } catch (error) {
      logger.warn(`[AdvancedMetrics] fetchLevel2OrderBook error for ${this.symbol}:`, error)
    }
  }

  private async getOptionsChainCached(): Promise<any[]> {
    const cacheKey = `chain:${this.symbol}:latest`

    let cached = cache.get(cacheKey)
    if (cached) {
      return cached as any[]
    }

    // Fetch the latest monthly options chain
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const expirationDate = nextMonth.toISOString().split('T')[0]

    try {
      const chain = await thetaDataClient.getOptionsChain(this.symbol, expirationDate)
      if (chain && chain.length > 0) {
        cache.set(cacheKey, chain, 300) // 5 min cache
        return chain
      }
    } catch (error) {
      logger.warn(`[AdvancedMetrics] Failed to fetch options chain for ${this.symbol}:`, error)
    }

    return []
  }

  private calculateDTE(expirationDate: string): number {
    const expDate = new Date(expirationDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expDate.setHours(0, 0, 0, 0)
    const diffTime = expDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private scheduleFlush(): void {
    if (this.bufferTimer) return

    this.bufferTimer = setTimeout(() => {
      this.flush()
      this.bufferTimer = null
    }, this.bufferFlushInterval)
  }

  private flush(): void {
    if (Object.keys(this.updateBuffer).length === 0) return

    const update: AdvancedMetricsUpdate = {
      symbol: this.symbol,
      timestamp: Date.now(),
      ...this.updateBuffer
    }

    this.callbacks.onUpdate(update)
    this.updateBuffer = {}
  }

  stop(): void {
    if (!this.pollers.has(`${this.symbol}-volatile`)) {
      return // Not polling
    }

    logger.info(`[AdvancedMetrics] Stopping poller for ${this.symbol}`)

    this.pollers.forEach((poller, key) => {
      if (key.startsWith(this.symbol)) {
        clearInterval(poller)
      }
    })

    this.pollers.delete(`${this.symbol}-volatile`)
    this.pollers.delete(`${this.symbol}-stable`)

    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer)
      this.bufferTimer = null
    }

    // Flush any pending data before stopping
    if (Object.keys(this.updateBuffer).length > 0) {
      this.flush()
    }
  }

  isRunning(): boolean {
    return this.pollers.has(`${this.symbol}-volatile`)
  }
}

export class AdvancedMetricsRegistry {
  private pollers: Map<string, AdvancedMetricsPoller> = new Map()
  private callbacks: AdvancedMetricsCallback

  constructor(callbacks: AdvancedMetricsCallback) {
    this.callbacks = callbacks
  }

  getOrCreatePoller(symbol: string): AdvancedMetricsPoller {
    const normalizedSymbol = symbol.toUpperCase()
    if (!this.pollers.has(normalizedSymbol)) {
      const poller = new AdvancedMetricsPoller(normalizedSymbol, this.callbacks)
      this.pollers.set(normalizedSymbol, poller)
    }
    return this.pollers.get(normalizedSymbol)!
  }

  startPoller(symbol: string): void {
    const poller = this.getOrCreatePoller(symbol)
    poller.start()
  }

  stopPoller(symbol: string): void {
    const normalizedSymbol = symbol.toUpperCase()
    const poller = this.pollers.get(normalizedSymbol)
    if (poller) {
      poller.stop()
      this.pollers.delete(normalizedSymbol)
    }
  }

  stopAll(): void {
    this.pollers.forEach((poller, symbol) => {
      poller.stop()
    })
    this.pollers.clear()
  }
}
