// Setup Validation Types
export interface GEXData {
  callWall: number
  putWall: number
  netGEX: number
  gammaFlip: boolean
  gammaPositive: boolean
}

export interface PriceActionData {
  currentPrice: number
  vwapMonth: number
  avwapHigh: number
  avwapLow: number
  apvpHigh: number
  apvpLow: number
  ema21: number
  sma200: number
}

export interface VolatilityCVDData {
  ivPercent: number
  cvdValue: number
  cvdEMA: number
  cvdDivergence: 'bullish' | 'bearish' | 'none'
  institutionalVolume: boolean
}

export interface OptionsData {
  symbol: string
  strategy: 'CALL_CREDIT_SPREAD' | 'PUT_CREDIT_SPREAD' | 'CALL_DEBIT_SPREAD' | 'PUT_DEBIT_SPREAD' | 'IRON_CONDOR' | 'IRON_BUTTERFLY'
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
  recommendation: 'PUT_CREDIT_SPREAD' | 'CALL_CREDIT_SPREAD' | 'PUT_DEBIT_SPREAD' | 'CALL_DEBIT_SPREAD' | 'IRON_CONDOR' | 'IRON_BUTTERFLY' | 'WAIT'
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
