// Mirror of frontend TradeEntry type
export interface TradeEntry {
  id: string
  entryNumber: number
  dateEntry: Date
  symbol: string
  strategy: string
  strikePrice: number
  delta: number
  daysToExpiration: number
  ivPercent: number
  gexStatus: 'positivo' | 'negativo'
  pvpStatus: string
  vwapStatus: string
  confluenceScore: number
  entryPrice: number
  takeProfit: number
  stopLoss: number
  status: 'open' | 'closed' | 'cancelled'
  exitPrice?: number
  exitDate?: Date
  profitLoss?: number
  percentReturn?: number
  comments?: string
  screenshots?: string[]
}

// Filter interface for trade queries
export interface TradeFilter {
  status?: 'open' | 'closed' | 'cancelled'
  strategy?: string
  confluenceMin?: number
  confluenceMax?: number
  zScoreMin?: number
  zScoreMax?: number
  searchSymbol?: string
  limit?: number
  offset?: number
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Statistics interface
export interface Statistics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  averageProfit: number
  averageLoss: number
  profitFactor: number
  totalProfitLoss: number
  bestTrade: number
  worstTrade: number
  byStrategy: Record<string, StrategyStats>
  byConfluenceScore: ConfluenceStats
}

export interface StrategyStats {
  count: number
  winRate: number
  avgProfitLoss: number
}

export interface ConfluenceStats {
  high: ConfluenceGroup
  medium: ConfluenceGroup
  low: ConfluenceGroup
}

export interface ConfluenceGroup {
  winRate: number
  avgProfit: number
}

// Sync related
export interface SyncRequest {
  trades: TradeEntry[]
  clientId: string
}

export interface SyncResponse {
  synced: number
  conflicts: number
  errors: string[]
}
