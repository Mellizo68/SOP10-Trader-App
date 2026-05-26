import { useEffect, useState, useCallback, useRef } from 'react'
import { getWebSocketClient } from '../utils/wsClient'
import { AdvancedWebSocketMessage } from '../types/advancedMetrics'
import { AdvancedMetricsUpdate, OrderFlow, VolatilityTermStructure, VolatilitySkew } from '../types/advancedMetrics'

interface UseAdvancedMetricsOptions {
  symbol: string
  onUpdate?: (update: AdvancedMetricsUpdate) => void
  fallbackPollInterval?: number
}

interface UseAdvancedMetricsState {
  orderFlow: OrderFlow | null
  volatilityTermStructure: VolatilityTermStructure[] | null
  volatilitySkew: VolatilitySkew[] | null
  level2OrderBook: { bids: Array<{ price: number; volume: number }>; asks: Array<{ price: number; volume: number }> } | null
  isConnected: boolean
  isFailed: boolean
  usesRestFallback: boolean
  lastUpdate: number | null
}

export function useAdvancedMetrics({
  symbol,
  onUpdate,
  fallbackPollInterval = 5000
}: UseAdvancedMetricsOptions): UseAdvancedMetricsState {
  const [state, setState] = useState<UseAdvancedMetricsState>({
    orderFlow: null,
    volatilityTermStructure: null,
    volatilitySkew: null,
    level2OrderBook: null,
    isConnected: false,
    isFailed: false,
    usesRestFallback: false,
    lastUpdate: null
  })

  const fallbackPollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeRef = useRef<(() => void)[]>([])

  const handleAdvancedMetricsUpdate = useCallback((message: AdvancedWebSocketMessage) => {
    if (message.type === 'advanced-metrics-update' && message.data?.symbol === symbol.toUpperCase()) {
      const { orderFlow, volatilityTermStructure, volatilitySkew, level2OrderBook } = message.data
      setState(prev => {
        const dataChanged = JSON.stringify({
          orderFlow: prev.orderFlow,
          volatilityTermStructure: prev.volatilityTermStructure,
          volatilitySkew: prev.volatilitySkew,
          level2OrderBook: prev.level2OrderBook
        }) !== JSON.stringify({
          orderFlow: orderFlow || null,
          volatilityTermStructure: volatilityTermStructure || null,
          volatilitySkew: volatilitySkew || null,
          level2OrderBook: level2OrderBook || null
        })

        if (!dataChanged) {
          return prev
        }

        onUpdate?.(message.data)
        return {
          ...prev,
          orderFlow: orderFlow || null,
          volatilityTermStructure: volatilityTermStructure || null,
          volatilitySkew: volatilitySkew || null,
          level2OrderBook: level2OrderBook || null,
          lastUpdate: Date.now()
        }
      })
    }
  }, [symbol, onUpdate])

  const handleStateChange = useCallback((newState: 'connecting' | 'connected' | 'disconnected' | 'failed') => {
    console.log('[Hook] handleStateChange called with:', newState, 'for symbol:', symbol)
    setState(prev => {
      if (newState === 'connected') {
        console.log('[Hook] Setting connected state')
        return {
          ...prev,
          isConnected: true,
          isFailed: false,
          usesRestFallback: false
        }
      } else if (newState === 'failed') {
        console.log('[Hook] Setting failed state, activating REST fallback')
        return {
          ...prev,
          isConnected: false,
          isFailed: true,
          usesRestFallback: true
        }
      } else if (newState === 'disconnected') {
        console.log('[Hook] Setting disconnected state')
        return {
          ...prev,
          isConnected: false
        }
      } else {
        return prev
      }
    })
  }, [symbol])

  useEffect(() => {
    console.log('[Hook] useEffect 1: Setting up WebSocket for symbol:', symbol)
    const wsClient = getWebSocketClient()

    const unsubscribeMessage = wsClient.onMessage(handleAdvancedMetricsUpdate)
    const unsubscribeState = wsClient.onStateChange(handleStateChange)

    unsubscribeRef.current = [unsubscribeMessage, unsubscribeState]

    if (!wsClient.isConnected()) {
      console.log('[Hook] WebSocket not connected, attempting to connect')
      wsClient.connect()
        .then(() => {
          console.log('[Hook] Connected, now subscribing to advanced metrics for', symbol)
          wsClient.subscribeAdvanced(symbol)
        })
        .catch(error => {
          console.error('[Hook] Failed to connect to WebSocket:', error)
        })
    } else {
      console.log('[Hook] WebSocket already connected, firing connected state and subscribing')
      handleStateChange('connected')
      wsClient.subscribeAdvanced(symbol)
    }

    return () => {
      console.log('[Hook] Cleanup: unsubscribing from', symbol)
      unsubscribeRef.current.forEach(unsub => unsub())
      wsClient.unsubscribeAdvanced(symbol)
    }
  }, [symbol, handleAdvancedMetricsUpdate, handleStateChange])

  // REST polling fallback
  useEffect(() => {
    console.log('[Hook] useEffect 3: REST fallback status changed, usesRestFallback:', state.usesRestFallback)
    if (!state.usesRestFallback) {
      if (fallbackPollTimerRef.current) {
        console.log('[Hook] Clearing REST polling fallback timer')
        clearInterval(fallbackPollTimerRef.current)
        fallbackPollTimerRef.current = null
      }
      return
    }

    console.log('[Hook] Activating REST polling fallback for advanced metrics:', symbol)

    fallbackPollTimerRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/market/advanced-metrics?symbol=${symbol}`)
        if (!response.ok) return

        const data = await response.json()

        const update: AdvancedMetricsUpdate = {
          symbol: symbol.toUpperCase(),
          timestamp: Date.now(),
          orderFlow: data.orderFlow,
          volatilityTermStructure: data.volatilityTermStructure,
          volatilitySkew: data.volatilitySkew,
          level2OrderBook: data.level2OrderBook
        }

        setState(prev => ({
          ...prev,
          orderFlow: update.orderFlow || null,
          volatilityTermStructure: update.volatilityTermStructure || null,
          volatilitySkew: update.volatilitySkew || null,
          level2OrderBook: update.level2OrderBook || null,
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
