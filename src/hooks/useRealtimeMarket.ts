import { useEffect, useState, useCallback, useRef } from 'react'
import { getWebSocketClient } from '../utils/wsClient'
import { MarketUpdate, WebSocketMessage } from '../types/websocket'

interface UseRealtimeMarketOptions {
  symbol: string
  onUpdate?: (update: MarketUpdate) => void
  fallbackPollInterval?: number
}

interface UseRealtimeMarketState {
  data: MarketUpdate | null
  isConnected: boolean
  isFailed: boolean
  usesRestFallback: boolean
  lastUpdate: number | null
}

export function useRealtimeMarket({
  symbol,
  onUpdate,
  fallbackPollInterval = 5000
}: UseRealtimeMarketOptions): UseRealtimeMarketState {
  const [state, setState] = useState<UseRealtimeMarketState>({
    data: null,
    isConnected: false,
    isFailed: false,
    usesRestFallback: false,
    lastUpdate: null
  })

  const fallbackPollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeRef = useRef<(() => void)[]>([])

  const handleMarketUpdate = useCallback((message: WebSocketMessage) => {
    if (message.type === 'market-update' && message.data?.symbol === symbol.toUpperCase()) {
      setState(prev => {
        const newData = message.data || null
        const dataChanged = JSON.stringify(prev.data) !== JSON.stringify(newData)

        if (!dataChanged) {
          return prev
        }

        onUpdate?.(newData!)
        return {
          ...prev,
          data: newData,
          lastUpdate: Date.now()
        }
      })
    }
  }, [symbol, onUpdate])

  const handleStateChange = useCallback((newState: 'connecting' | 'connected' | 'disconnected' | 'failed') => {
    setState(prev => {
      if (newState === 'connected') {
        return {
          ...prev,
          isConnected: true,
          isFailed: false,
          usesRestFallback: false
        }
      } else if (newState === 'failed') {
        return {
          ...prev,
          isConnected: false,
          isFailed: true,
          usesRestFallback: true
        }
      } else if (newState === 'disconnected') {
        return {
          ...prev,
          isConnected: false
        }
      } else {
        return prev
      }
    })
  }, [])

  useEffect(() => {
    const wsClient = getWebSocketClient()

    // Setup message and state handlers
    const unsubscribeMessage = wsClient.onMessage(handleMarketUpdate)
    const unsubscribeState = wsClient.onStateChange(handleStateChange)

    unsubscribeRef.current = [unsubscribeMessage, unsubscribeState]

    // Connect if not already connected
    if (!wsClient.isConnected()) {
      wsClient.connect()
        .then(() => {
          console.log('[Hook] Connected, now subscribing to', symbol)
          wsClient.subscribe(symbol)
        })
        .catch(error => {
          console.error('Failed to connect to WebSocket:', error)
        })
    } else {
      console.log('[Hook] Already connected, subscribing to', symbol)
      handleStateChange('connected')
      wsClient.subscribe(symbol)
    }

    return () => {
      // Cleanup
      unsubscribeRef.current.forEach(unsub => unsub())
      wsClient.unsubscribe(symbol)
    }
  }, [symbol, handleMarketUpdate, handleStateChange])

  // REST polling fallback when WebSocket fails
  useEffect(() => {
    if (!state.usesRestFallback) {
      if (fallbackPollTimerRef.current) {
        clearInterval(fallbackPollTimerRef.current)
        fallbackPollTimerRef.current = null
      }
      return
    }

    console.log('Activating REST polling fallback for', symbol)

    fallbackPollTimerRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/market/gex?symbol=${symbol}`)
        if (!response.ok) return

        const gexData = await response.json()

        const update: MarketUpdate = {
          symbol: symbol.toUpperCase(),
          timestamp: Date.now(),
          gex: gexData
        }

        setState(prev => ({
          ...prev,
          data: update,
          lastUpdate: Date.now()
        }))

        onUpdate?.(update)
      } catch (error) {
        console.error('REST polling fallback error:', error)
      }
    }, fallbackPollInterval)

    return () => {
      if (fallbackPollTimerRef.current) {
        clearInterval(fallbackPollTimerRef.current)
        fallbackPollTimerRef.current = null
      }
    }
  }, [state.usesRestFallback, symbol, onUpdate, fallbackPollInterval])

  return state
}
