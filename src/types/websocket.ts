export interface MarketUpdate {
  symbol: string
  timestamp: number
  gex?: any
  greeks?: any
  gammaFlip?: any
  optionsWalls?: any
  volumeOI?: any
}

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

export type WebSocketMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'subscribe-advanced'
  | 'unsubscribe-advanced'
  | 'market-update'
  | 'advanced-metrics-update'
  | 'error'

export interface WebSocketMessage {
  type: WebSocketMessageType
  symbol?: string
  data?: MarketUpdate | AdvancedMetricsUpdate
  error?: string
}
