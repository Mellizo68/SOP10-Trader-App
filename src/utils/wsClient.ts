import { MarketUpdate, WebSocketMessage } from '../types/websocket'

type MessageHandler = (message: WebSocketMessage) => void
type StateChangeHandler = (state: 'connecting' | 'connected' | 'disconnected' | 'failed') => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private messageHandlers: Set<MessageHandler> = new Set()
  private stateHandlers: Set<StateChangeHandler> = new Set()
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 3
  private reconnectDelay: number = 1000
  private maxReconnectDelay: number = 30000
  private reconnectTimer: NodeJS.Timeout | null = null
  private isManualClose: boolean = false
  private debug: boolean = import.meta.env.DEV

  constructor(url: string) {
    this.url = url
  }

  /**
   * Enable/disable debug logging
   * @param enabled - Set to true for verbose logging, false for production mode
   */
  setDebugMode(enabled: boolean): void {
    this.debug = enabled
    if (enabled) {
      console.log('[WS] Debug mode enabled')
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        if (this.debug) console.log('[WS] Already connected, resolving immediately')
        resolve()
        return
      }

      if (this.debug) console.log('[WS] Starting connection to', this.url)
      this.notifyStateChange('connecting')

      try {
        if (this.debug) console.log('[WS] Creating WebSocket instance')
        this.ws = new WebSocket(this.url)
        if (this.debug) console.log('[WS] WebSocket instance created, waiting for events')

        this.ws.onopen = () => {
          if (this.debug) console.log('[WS] Connection opened successfully')
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          this.notifyStateChange('connected')
          resolve()
        }

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            if (this.debug) console.log('[WS] Message received:', event.data.substring(0, 100))
            const message = JSON.parse(event.data) as WebSocketMessage
            this.messageHandlers.forEach(handler => handler(message))
          } catch (error) {
            console.error('[WS] Failed to parse message:', error)
          }
        }

        this.ws.onerror = (event: Event) => {
          console.error('[WS] WebSocket error event fired:', event)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          if (this.debug) console.log('[WS] Connection closed, isManualClose:', this.isManualClose)
          if (!this.isManualClose) {
            this.handleDisconnect()
          }
          this.notifyStateChange('disconnected')
        }
      } catch (error) {
        console.error('[WS] Exception during connection setup:', error)
        reject(error)
      }
    })
  }

  private handleDisconnect(): void {
    if (this.debug) console.log('[WS] handleDisconnect called, attempts:', this.reconnectAttempts)
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnection attempts reached, switching to REST polling')
      this.notifyStateChange('failed')
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    )

    this.reconnectAttempts++
    if (this.debug) console.log(`[WS] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    this.reconnectTimer = setTimeout(() => {
      if (this.debug) console.log(`[WS] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      this.connect().catch(error => {
        console.error('[WS] Reconnection failed:', error)
      })
    }, delay)
  }

  disconnect(): void {
    this.isManualClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.notifyStateChange('disconnected')
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending message:', message.type, message.symbol)
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[WS] Not connected (state:', this.ws?.readyState, '), cannot send message:', message.type)
    }
  }

  subscribe(symbol: string): void {
    console.log('[WS] Subscribing to', symbol)
    this.send({
      type: 'subscribe',
      symbol: symbol.toUpperCase()
    })
  }

  unsubscribe(symbol: string): void {
    console.log('[WS] Unsubscribing from', symbol)
    this.send({
      type: 'unsubscribe',
      symbol: symbol.toUpperCase()
    })
  }

  subscribeAdvanced(symbol: string): void {
    console.log('[WS] Subscribing to advanced metrics for', symbol)
    this.send({
      type: 'subscribe-advanced',
      symbol: symbol.toUpperCase()
    })
  }

  unsubscribeAdvanced(symbol: string): void {
    console.log('[WS] Unsubscribing from advanced metrics for', symbol)
    this.send({
      type: 'unsubscribe-advanced',
      symbol: symbol.toUpperCase()
    })
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler)
    return () => {
      this.stateHandlers.delete(handler)
    }
  }

  private notifyStateChange(state: 'connecting' | 'connected' | 'disconnected' | 'failed'): void {
    console.log(`[WS] State change: ${state}, notifying ${this.stateHandlers.size} handlers`)
    this.stateHandlers.forEach(handler => handler(state))
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  isFailed(): boolean {
    return this.reconnectAttempts >= this.maxReconnectAttempts
  }
}

let wsClient: WebSocketClient | null = null

export function initializeWebSocketClient(url: string): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient(url)
  }
  return wsClient
}

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    const isDev = import.meta.env.DEV
    const wsUrl = isDev ? 'ws://localhost:8081' : `wss://${window.location.host}:8081`
    wsClient = new WebSocketClient(wsUrl)
  }
  return wsClient
}
