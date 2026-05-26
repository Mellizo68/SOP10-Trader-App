export interface VolatilityTermStructure {
  expirationDate: string
  iv: number
  daysToExpiration: number
}

export interface VolatilitySkew {
  strikePrice: number
  callIV: number
  putIV: number
  skewDifference: number // putIV - callIV
}

export interface OrderFlow {
  timestamp: number
  netDeltaFlow: number // Aggregate delta of recent trades
  callDeltaFlow: number
  putDeltaFlow: number
  buyPressure: number // % of buy volume
  sellPressure: number // % of sell volume
  netFlow: number // net buy volume
}

export interface AdvancedMetricsUpdate {
  symbol: string
  timestamp: number
  orderFlow?: OrderFlow
  volatilityTermStructure?: VolatilityTermStructure[]
  volatilitySkew?: VolatilitySkew[]
  level2OrderBook?: {
    bids: Array<{ price: number; volume: number }>
    asks: Array<{ price: number; volume: number }>
  }
}

export interface AdvancedWebSocketMessage {
  type: 'subscribe-advanced' | 'unsubscribe-advanced' | 'advanced-metrics-update' | 'error'
  symbol?: string
  data?: AdvancedMetricsUpdate
  error?: string
}
