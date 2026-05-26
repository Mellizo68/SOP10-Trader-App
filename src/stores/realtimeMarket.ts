import { create } from 'zustand'
import { MarketUpdate } from '../types/websocket'
import { AdvancedMetricsUpdate } from '../types/advancedMetrics'

interface SymbolSubscription {
  data: MarketUpdate | null
  advancedData: AdvancedMetricsUpdate | null
  isConnected: boolean
  isFailed: boolean
  usesRestFallback: boolean
  lastUpdate: number | null
  lastAdvancedUpdate: number | null
}

interface RealtimeMarketStore {
  subscriptions: Map<string, SymbolSubscription>
  subscribe: (symbol: string) => void
  unsubscribe: (symbol: string) => void
  updateData: (symbol: string, update: MarketUpdate) => void
  updateAdvancedData: (symbol: string, update: AdvancedMetricsUpdate) => void
  setConnectionStatus: (symbol: string, status: 'connected' | 'disconnected' | 'failed') => void
  getSubscription: (symbol: string) => SymbolSubscription | null
  getAllActiveSymbols: () => string[]
  clear: () => void
}

export const useRealtimeMarketStore = create<RealtimeMarketStore>((set, get) => ({
  subscriptions: new Map(),

  subscribe: (symbol) => {
    const normalized = symbol.toUpperCase()
    set((state) => {
      const newMap = new Map(state.subscriptions)
      if (!newMap.has(normalized)) {
        newMap.set(normalized, {
          data: null,
          advancedData: null,
          isConnected: false,
          isFailed: false,
          usesRestFallback: false,
          lastUpdate: null,
          lastAdvancedUpdate: null,
        })
      }
      return { subscriptions: newMap }
    })
  },

  unsubscribe: (symbol) => {
    const normalized = symbol.toUpperCase()
    set((state) => {
      const newMap = new Map(state.subscriptions)
      newMap.delete(normalized)
      return { subscriptions: newMap }
    })
  },

  updateData: (symbol, update) => {
    const normalized = symbol.toUpperCase()
    set((state) => {
      const newMap = new Map(state.subscriptions)
      const existing = newMap.get(normalized)
      if (existing) {
        newMap.set(normalized, {
          ...existing,
          data: update,
          lastUpdate: Date.now(),
        })
      }
      return { subscriptions: newMap }
    })
  },

  updateAdvancedData: (symbol, update) => {
    const normalized = symbol.toUpperCase()
    set((state) => {
      const newMap = new Map(state.subscriptions)
      const existing = newMap.get(normalized)
      if (existing) {
        newMap.set(normalized, {
          ...existing,
          advancedData: update,
          lastAdvancedUpdate: Date.now(),
        })
      }
      return { subscriptions: newMap }
    })
  },

  setConnectionStatus: (symbol, status) => {
    const normalized = symbol.toUpperCase()
    set((state) => {
      const newMap = new Map(state.subscriptions)
      const existing = newMap.get(normalized)
      if (existing) {
        newMap.set(normalized, {
          ...existing,
          isConnected: status === 'connected',
          isFailed: status === 'failed',
          usesRestFallback: status === 'failed',
        })
      }
      return { subscriptions: newMap }
    })
  },

  getSubscription: (symbol) => {
    const normalized = symbol.toUpperCase()
    return get().subscriptions.get(normalized) || null
  },

  getAllActiveSymbols: () => {
    return Array.from(get().subscriptions.keys())
  },

  clear: () => {
    set({ subscriptions: new Map() })
  },
}))
