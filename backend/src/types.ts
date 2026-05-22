/**
 * Trade Entry Type
 */
export interface TradeEntry {
  id: string;
  entryNumber: number;
  dateEntry: Date;
  symbol: string;
  strategy: string;
  confluenceScore: number;
  entryPrice: number;
  targetEntry: number;
  targetTP: number;
  targetSL: number;
  strikePrice?: number;
  delta?: number;
  daysToExpiration?: number;
  ivPercent?: number;
  gexStatus?: string;
  pvpStatus?: string;
  vwapStatus?: string;
  takeProfit?: number;
  stopLoss?: number;
  status: 'open' | 'closed';
  exitPrice?: number;
  exitDate?: Date;
  profitLoss?: number;
  percentReturn?: number;
  comments?: string;
  screenshots?: string[];
}

/**
 * Statistics Type
 */
export interface Statistics {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfitLoss: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  byStrategy: Record<string, StrategyStats>;
  byConfluence: ConfluenceStats;
}

export interface StrategyStats {
  count: number;
  winRate: number;
  averagePL: number;
}

export interface ConfluenceStats {
  high: { count: number; winRate: number; avgPL: number };
  medium: { count: number; winRate: number; avgPL: number };
  low: { count: number; winRate: number; avgPL: number };
}

/**
 * Market Data Types
 */
export interface MarketDataRequest {
  symbol: string;
  strike?: number;
  expiration?: string;
}

/**
 * API Response Types
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Trade Filter Type
 */
export interface TradeFilter {
  status?: 'open' | 'closed';
  strategy?: string;
  confluenceMin?: number;
  confluenceMax?: number;
  zScoreMin?: number;
  zScoreMax?: number;
  searchSymbol?: string;
  startDate?: Date;
  endDate?: Date;
}
