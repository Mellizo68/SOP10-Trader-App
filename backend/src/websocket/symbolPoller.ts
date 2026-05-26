import { flashAlphaClient } from '../api/flashalpha-client'
import { thetaDataClient } from '../api/thetadata-client'
import logger from '../utils/logger'

export interface MarketUpdate {
  symbol: string
  timestamp: number
  gex?: any
  greeks?: any
  gammaFlip?: any
  optionsWalls?: any
  volumeOI?: any
}

export interface PollerCallback {
  onUpdate: (update: MarketUpdate) => void
  onError: (symbol: string, error: Error) => void
}

export class SymbolPoller {
  private symbol: string
  private pollers: Map<string, NodeJS.Timeout> = new Map()
  private callbacks: PollerCallback
  private updateBuffer: Partial<MarketUpdate> = {}
  private bufferFlushInterval: number = 1000 // stable display: 1s between batches
  private bufferTimer: NodeJS.Timeout | null = null
  private pollInterval: number = 500 // 0.5s between ThetaData calls

  constructor(symbol: string, callbacks: PollerCallback) {
    this.symbol = symbol
    this.callbacks = callbacks
  }

  start(): void {
    const pollerKey = `${this.symbol}-active`
    if (this.pollers.has(pollerKey)) {
      return // Already polling
    }

    logger.info(`[WebSocket] Starting poller for ${this.symbol}`)

    // Start polling GEX
    const gexPoller = setInterval(async () => {
      try {
        const data = await flashAlphaClient.getGEX(this.symbol)
        this.updateBuffer.gex = data
        this.scheduleFlush()
      } catch (error) {
        logger.warn(`[WebSocket] GEX poll error for ${this.symbol}:`, error)
        this.callbacks.onError(this.symbol, error as Error)
      }
    }, this.pollInterval)

    // Start polling Greeks
    const greeksPoller = setInterval(async () => {
      try {
        const data = await flashAlphaClient.getGreeksBySymbol(this.symbol)
        this.updateBuffer.greeks = data
        this.scheduleFlush()
      } catch (error) {
        logger.warn(`[WebSocket] Greeks poll error for ${this.symbol}:`, error)
        this.callbacks.onError(this.symbol, error as Error)
      }
    }, this.pollInterval)

    // Start polling Options Walls
    const wallsPoller = setInterval(async () => {
      try {
        const data = await flashAlphaClient.getOptionsWalls(this.symbol)
        this.updateBuffer.optionsWalls = data
        this.scheduleFlush()
      } catch (error) {
        logger.warn(`[WebSocket] Options walls poll error for ${this.symbol}:`, error)
        this.callbacks.onError(this.symbol, error as Error)
      }
    }, this.pollInterval)

    // Start polling Volume/OI
    const volumePoller = setInterval(async () => {
      try {
        const data = await flashAlphaClient.getVolumeAndOI(this.symbol)
        this.updateBuffer.volumeOI = data
        this.scheduleFlush()
      } catch (error) {
        logger.warn(`[WebSocket] Volume/OI poll error for ${this.symbol}:`, error)
        this.callbacks.onError(this.symbol, error as Error)
      }
    }, this.pollInterval)

    this.pollers.set(`${this.symbol}-gex`, gexPoller)
    this.pollers.set(`${this.symbol}-greeks`, greeksPoller)
    this.pollers.set(`${this.symbol}-walls`, wallsPoller)
    this.pollers.set(`${this.symbol}-volume`, volumePoller)
    this.pollers.set(pollerKey, true as any)
  }

  private scheduleFlush(): void {
    // If buffer timer already exists, don't create another
    if (this.bufferTimer) return

    this.bufferTimer = setTimeout(() => {
      this.flush()
      this.bufferTimer = null
    }, this.bufferFlushInterval)
  }

  private flush(): void {
    if (Object.keys(this.updateBuffer).length === 0) return

    const update: MarketUpdate = {
      symbol: this.symbol,
      timestamp: Date.now(),
      ...this.updateBuffer
    }

    this.callbacks.onUpdate(update)
    this.updateBuffer = {}
  }

  stop(): void {
    if (!this.pollers.has(`${this.symbol}-gex`)) {
      return // Not polling
    }

    logger.info(`[WebSocket] Stopping poller for ${this.symbol}`)

    this.pollers.forEach((poller, key) => {
      if (key.startsWith(this.symbol)) {
        clearInterval(poller)
      }
    })

    this.pollers.delete(`${this.symbol}-gex`)
    this.pollers.delete(`${this.symbol}-greeks`)
    this.pollers.delete(`${this.symbol}-walls`)
    this.pollers.delete(`${this.symbol}-volume`)

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
    return this.pollers.has(`${this.symbol}-gex`)
  }
}

export class PollerRegistry {
  private pollers: Map<string, SymbolPoller> = new Map()
  private callbacks: PollerCallback

  constructor(callbacks: PollerCallback) {
    this.callbacks = callbacks
  }

  getOrCreatePoller(symbol: string): SymbolPoller {
    const normalizedSymbol = symbol.toUpperCase()
    if (!this.pollers.has(normalizedSymbol)) {
      const poller = new SymbolPoller(normalizedSymbol, this.callbacks)
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
