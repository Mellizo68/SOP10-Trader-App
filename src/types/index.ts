// Setup Validation Types
export interface GEXData {
  // Call Walls (Resistencia)
  callWall1: number  // C1 - Muro más cercano
  callWall2: number  // C2 - Muro intermedio
  callWall3: number  // C3 - Muro lejano

  // Put Walls (Soporte)
  putWall1: number   // P1 - Muro más cercano
  putWall2: number   // P2 - Muro intermedio
  putWall3: number   // P3 - Muro lejano

  // Net GEX
  netGEX: number
  gammaFlip: boolean
  gammaPositive: boolean
}

export interface PriceActionData {
  // Precio Actual
  currentPrice: number

  // VWAP (Volumen Ponderado)
  vwapMonth: number

  // AVWAP (Anchored VWAP)
  avwapHigh: number
  avwapLow: number
  avwapMonth: number  // AVWAP Mensual

  // Point of Control (Máximo Volumen)
  pocMonth: number    // POC Mensual

  // APVP (Volume Profile)
  apvpHigh: number
  apvpLow: number

  // Medias Móviles
  ema21: number
  sma200: number
}

export interface VolatilityCVDData {
  // IV (Implied Volatility)
  ivPercent: number

  // CVD (Cumulative Volume Delta)
  cvdValue: number
  cvdEMA: number
  cvdDelta: number        // Cambio en CVD (velocidad)

  // Divergencia
  cvdDivergence: 'bullish' | 'bearish' | 'none'
  cvdDivergenceStrength: 'weak' | 'medium' | 'strong'  // Fuerza de divergencia

  // Volumen
  institutionalVolume: boolean

  // Z-Score (Actividad Institucional)
  zScore?: number         // Desviación estándar del CVD respecto al promedio
  zVol?: number          // Z-Score del volumen
  institutionalActivityStatus?: 'strong_buy' | 'strong_sell' | 'normal' | 'weak'  // Interpretación del Z-Score
}

export interface OptionsData {
  symbol: string
  strategy: 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD' | 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD' | 'IRON_CONDOR' | 'IRON_BUTTERFLY' | 'LONG_CALL' | 'LONG_PUT' | 'STRADDLE' | 'STRANGLE' | 'COLLAR' | 'COVERED_CALL' | 'PROTECTIVE_PUT'
  strikePrice: number
  delta: number
  gamma: number
  vega: number
  theta: number
  daysToExpiration: number
  optionType: 'call' | 'put'
}

export interface SetupValidation {
  gexData: GEXData
  priceAction: PriceActionData
  volatilityCVD: VolatilityCVDData
  options: OptionsData
  timestamp: Date
  screenshots: {
    gexScreenshot?: string
    cvdScreenshot?: string
    priceActionScreenshot?: string
  }
  comments: string
}

export interface AlternativeRecommendation {
  strategy: string
  reason: string
  trendCompatibility: number  // 0-100: Qué tan compatible es con la tendencia actual
}

export interface ValidationResult {
  confluenceScore: number // 0-100
  isValidSetup: boolean
  checks: {
    ivCheck: boolean
    gammaCheck: boolean
    cvdCheck: boolean
    priceConfluenceCheck: boolean
    trendCheck: boolean
    dteCheck: boolean
    deltaCheck: boolean
  }
  recommendation: string // Recomendación principal
  alternatives: AlternativeRecommendation[] // Alternativas válidas
  targetEntry: number
  targetTP: number // 50% de prima en crédito, 200% en débito
  targetSL: number // -200%
  warnings: string[]
  notes: string[]
}

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
  comments: string
  screenshots: string[]
}

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
  byStrategy: {
    [key: string]: {
      count: number
      winRate: number
      avgProfitLoss: number
    }
  }
  byConfluenceScore: {
    high: { winRate: number; avgProfit: number }
    medium: { winRate: number; avgProfit: number }
    low: { winRate: number; avgProfit: number }
  }
}

export interface TradeFilter {
  status?: 'open' | 'closed' | 'cancelled'
  strategy?: string
  confluenceMin?: number
  confluenceMax?: number
  zScoreMin?: number
  zScoreMax?: number
  searchSymbol?: string
  symbolSearch?: string
}

/**
 * Journal Entry Type
 * Stores trade-specific documentation: setup notes, execution analysis, reviews, and lessons
 */
export interface JournalEntry {
  id: string
  tradeId: string
  content: string // Markdown content
  sectionType: 'setup' | 'execution' | 'review' | 'lesson'
  createdAt: Date
  updatedAt: Date
}

/**
 * Media Entry Type - Phase E: Trade Screenshots & Media Storage
 * Stores trade media files (screenshots, charts, confirmations)
 */
export interface MediaEntry {
  id: string
  trade_id: string
  media_type: string // 'screenshot', 'chart', etc.
  file_name: string
  file_size: number // In bytes
  file_path: string
  mime_type?: string // 'image/jpeg', 'image/png', etc.
  s3_key?: string // AWS S3 key if uploaded to S3
  created_at: Date
  downloadUrl?: string // URL to download/view the file
}

/**
 * Analytics Types - Phase E: Advanced Analytics & Reporting
 */

/**
 * Overall Analytics Summary
 * Aggregate statistics across all closed trades
 */
export interface AnalyticsSummary {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number // Percentage 0-100
  profit_factor: number
  total_profit_loss: number
  average_win: number
  average_loss: number
  best_trade: number
  worst_trade: number
  sharpe_ratio: number
  max_drawdown: number
  recovery_factor: number
  risk_reward_ratio: number
  win_streak_max: number
  loss_streak_max: number
}

/**
 * Strategy Performance
 * Performance breakdown by individual strategy
 */
export interface StrategyPerformance {
  strategy: string
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_profit_loss: number
  average_trade: number
  best_trade: number
  worst_trade: number
  profit_factor: number
}

/**
 * Period Performance
 * Performance breakdown by time period (month or week)
 */
export interface PeriodPerformance {
  period: string // YYYY-MM format for month, IYYY-IW for week
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  profit_loss: number
  average_trade: number
}

/**
 * Win/Loss Statistics
 * Detailed statistics about winning and losing trades
 */
export interface WinLossStats {
  win_count: number
  loss_count: number
  win_rate: number
  average_win: number
  average_loss: number
  winning_ratio: number // Average win / Average loss
  total_wins: number
  total_losses: number
  profit_factor: number
}
