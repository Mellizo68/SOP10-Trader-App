import WebSocket, { WebSocketServer as WSSServer } from 'ws'
import { createServer } from 'http'
import { SubscriptionManager } from './subscriptionManager'
import { PollerRegistry, MarketUpdate } from './symbolPoller'
import { AdvancedMetricsRegistry, AdvancedMetricsUpdate } from './advancedMetricsPoller'
import logger from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'market-update' | 'subscribe-advanced' | 'unsubscribe-advanced' | 'advanced-metrics-update' | 'error'
  symbol?: string
  data?: any
  error?: string
}

export class WebSocketServer {
  private wss: WSSServer
  private subscriptionManager: SubscriptionManager
  private advancedSubscriptionManager: SubscriptionManager
  private pollerRegistry: PollerRegistry
  private advancedMetricsRegistry: AdvancedMetricsRegistry
  private clientMap: Map<string, WebSocket> = new Map()
  private port: number

  constructor(port: number = 8081) {
    this.port = port

    const server = createServer()
    this.wss = new WSSServer({ server })

    this.subscriptionManager = new SubscriptionManager({
      onSubscribe: (symbol) => this.onSymbolSubscribed(symbol),
      onUnsubscribe: (symbol) => this.onSymbolUnsubscribed(symbol)
    })

    this.advancedSubscriptionManager = new SubscriptionManager({
      onSubscribe: (symbol) => this.onSymbolSubscribedAdvanced(symbol),
      onUnsubscribe: (symbol) => this.onSymbolUnsubscribedAdvanced(symbol)
    })

    this.pollerRegistry = new PollerRegistry({
      onUpdate: (update) => this.broadcastUpdate(update),
      onError: (symbol, error) => this.broadcastError(symbol, error)
    })

    this.advancedMetricsRegistry = new AdvancedMetricsRegistry({
      onUpdate: (update) => this.broadcastAdvancedUpdate(update),
      onError: (symbol, error) => this.broadcastError(symbol, error)
    })

    this.setupServerListeners()
    server.listen(this.port, () => {
      logger.info(`[WebSocket] Server listening on port ${this.port}`)
    })
  }

  private setupServerListeners(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4()
      this.clientMap.set(clientId, ws)
      logger.info(`[WebSocket] Client connected: ${clientId}`)

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage
          this.handleMessage(clientId, message)
        } catch (error) {
          logger.warn(`[WebSocket] Failed to parse message from ${clientId}:`, error)
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }))
        }
      })

      ws.on('close', () => {
        logger.info(`[WebSocket] Client disconnected: ${clientId}`)
        this.subscriptionManager.removeClient(clientId)
        this.advancedSubscriptionManager.removeClient(clientId)
        this.clientMap.delete(clientId)
      })

      ws.on('error', (error: Error) => {
        logger.error(`[WebSocket] Client error (${clientId}):`, error)
      })
    })
  }

  private handleMessage(clientId: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (!message.symbol) {
          this.sendError(clientId, 'Symbol required for subscribe')
          return
        }
        this.subscriptionManager.subscribe(clientId, message.symbol)
        logger.debug(`[WebSocket] Client ${clientId} subscribed to ${message.symbol}`)
        break

      case 'unsubscribe':
        if (!message.symbol) {
          this.sendError(clientId, 'Symbol required for unsubscribe')
          return
        }
        this.subscriptionManager.unsubscribe(clientId, message.symbol)
        logger.debug(`[WebSocket] Client ${clientId} unsubscribed from ${message.symbol}`)
        break

      case 'subscribe-advanced':
        if (!message.symbol) {
          this.sendError(clientId, 'Symbol required for subscribe-advanced')
          return
        }
        this.advancedSubscriptionManager.subscribe(clientId, message.symbol)
        logger.debug(`[WebSocket] Client ${clientId} subscribed to advanced metrics for ${message.symbol}`)
        break

      case 'unsubscribe-advanced':
        if (!message.symbol) {
          this.sendError(clientId, 'Symbol required for unsubscribe-advanced')
          return
        }
        this.advancedSubscriptionManager.unsubscribe(clientId, message.symbol)
        logger.debug(`[WebSocket] Client ${clientId} unsubscribed from advanced metrics for ${message.symbol}`)
        break

      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`)
    }
  }

  private onSymbolSubscribed(symbol: string): void {
    logger.info(`[WebSocket] Starting polling for ${symbol}`)
    this.pollerRegistry.startPoller(symbol)
  }

  private onSymbolUnsubscribed(symbol: string): void {
    logger.info(`[WebSocket] Stopping polling for ${symbol}`)
    this.pollerRegistry.stopPoller(symbol)
  }

  private onSymbolSubscribedAdvanced(symbol: string): void {
    logger.info(`[WebSocket] Starting advanced metrics polling for ${symbol}`)
    this.advancedMetricsRegistry.startPoller(symbol)
  }

  private onSymbolUnsubscribedAdvanced(symbol: string): void {
    logger.info(`[WebSocket] Stopping advanced metrics polling for ${symbol}`)
    this.advancedMetricsRegistry.stopPoller(symbol)
  }

  private broadcastUpdate(update: MarketUpdate): void {
    const subscribers = this.subscriptionManager.getSubscribersForSymbol(update.symbol)
    const message = JSON.stringify({
      type: 'market-update',
      data: update
    })

    let successCount = 0
    let failureCount = 0

    subscribers.forEach(clientId => {
      const ws = this.clientMap.get(clientId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message)
          successCount++
        } catch (error) {
          logger.warn(`[WebSocket] Failed to send to ${clientId}:`, error)
          failureCount++
        }
      }
    })

    if (successCount > 0) {
      logger.debug(
        `[WebSocket] Broadcast ${update.symbol} to ${successCount} clients` +
        (failureCount > 0 ? ` (${failureCount} failed)` : '')
      )
    }
  }

  private broadcastAdvancedUpdate(update: AdvancedMetricsUpdate): void {
    const subscribers = this.advancedSubscriptionManager.getSubscribersForSymbol(update.symbol)
    const message = JSON.stringify({
      type: 'advanced-metrics-update',
      data: update
    })

    let successCount = 0
    let failureCount = 0

    subscribers.forEach(clientId => {
      const ws = this.clientMap.get(clientId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message)
          successCount++
        } catch (error) {
          logger.warn(`[WebSocket] Failed to send advanced metrics to ${clientId}:`, error)
          failureCount++
        }
      }
    })

    if (successCount > 0) {
      logger.debug(
        `[WebSocket] Broadcast advanced metrics ${update.symbol} to ${successCount} clients` +
        (failureCount > 0 ? ` (${failureCount} failed)` : '')
      )
    }
  }

  private broadcastError(symbol: string, error: Error): void {
    const subscribers = this.subscriptionManager.getSubscribersForSymbol(symbol)
    const message = JSON.stringify({
      type: 'error',
      symbol,
      error: error.message
    })

    subscribers.forEach(clientId => {
      const ws = this.clientMap.get(clientId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message)
        } catch (err) {
          logger.warn(`[WebSocket] Failed to send error to ${clientId}:`, err)
        }
      }
    })
  }

  private sendError(clientId: string, error: string): void {
    const ws = this.clientMap.get(clientId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        error
      }))
    }
  }

  getStats(): any {
    return {
      connectedClients: this.clientMap.size,
      activeSymbols: Array.from(this.subscriptionManager.getAllActiveSymbols()),
      subscriptionCount: Array.from(this.subscriptionManager.getAllActiveSymbols()).reduce(
        (acc, symbol) => acc + this.subscriptionManager.getSubscribersForSymbol(symbol).size,
        0
      )
    }
  }

  shutdown(): void {
    logger.info('[WebSocket] Shutting down server')
    this.pollerRegistry.stopAll()
    this.advancedMetricsRegistry.stopAll()
    this.wss.clients.forEach(ws => {
      ws.close()
    })
    this.wss.close()
  }
}

// Export singleton instance
let wsServer: WebSocketServer | null = null

export function getWebSocketServer(port?: number): WebSocketServer {
  if (!wsServer) {
    wsServer = new WebSocketServer(port || 8081)
  }
  return wsServer
}

export function shutdownWebSocketServer(): void {
  if (wsServer) {
    wsServer.shutdown()
    wsServer = null
  }
}
