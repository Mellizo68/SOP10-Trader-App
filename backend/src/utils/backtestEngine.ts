// import { HistoricalOptionsData } from '../../../mcp-server-bebeto/dist/utils/types.js' // TODO: Phase 9 - ThetaData integration
import { getStrategy, StrategyDefinition, calculatePnL } from './strategyLib.js'

// Placeholder type for Phase 9 integration
interface HistoricalOptionsData {
  date: string
  symbol: string
  expiration: string
  strike: number
  callPrice: number
  putPrice: number
  callDelta: number
  putDelta: number
  callGamma: number
  putGamma: number
}

/**
 * Trade record in a backtest
 */
export interface BacktestTrade {
  entryDate: string
  entryPrice: number
  entryLegPrices: { [strikePrice: number]: number }
  exitDate: string
  exitPrice: number
  exitLegPrices: { [strikePrice: number]: number }
  pnl: number
  pnlPercent: number
  daysHeld: number
  status: 'winner' | 'loser' | 'breakeven'
}

/**
 * Backtest metrics
 */
export interface BacktestMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  winRate: number // percentage
  profitFactor: number // sum of wins / sum of losses
  totalPnL: number
  avgPnL: number
  avgWin: number
  avgLoss: number
  maxDrawdown: number
  sharpeRatio: number
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
}

/**
 * Backtest result
 */
export interface BacktestResult {
  backtestId: string
  symbol: string
  strategy: string
  strategyDefinition: StrategyDefinition | null
  entryDate: string
  exitDate: string
  status: 'completed' | 'error'
  error?: string
  trades: BacktestTrade[]
  metrics: BacktestMetrics
  pnlCurve: { date: string; cumulativePnL: number }[]
  createdAt: string
}

/**
 * Options Backtest Engine
 * Executes strategy backtests using historical data
 */
export class BacktestEngine {
  /**
   * Run a backtest for a specific strategy and symbol
   */
  async runBacktest(
    backtestId: string,
    symbol: string,
    strategyName: string,
    entryDate: string,
    exitDate: string,
    historicalData: { [strikeKey: string]: HistoricalOptionsData[] },
    parameters?: Record<string, unknown>
  ): Promise<BacktestResult> {
    try {
      const strategy = getStrategy(strategyName)

      if (!strategy) {
        return {
          backtestId,
          symbol,
          strategy: strategyName,
          strategyDefinition: null,
          entryDate,
          exitDate,
          status: 'error',
          error: `Strategy "${strategyName}" not found`,
          trades: [],
          metrics: getEmptyMetrics(),
          pnlCurve: [],
          createdAt: new Date().toISOString(),
        }
      }

      // TODO: Phase 9 - Full backtest simulation requires ThetaData historical data
      // For now, return empty backtest result
      return {
        backtestId,
        symbol,
        strategy: strategyName,
        strategyDefinition: strategy,
        entryDate,
        exitDate,
        status: 'completed',
        trades: [],
        metrics: getEmptyMetrics(),
        pnlCurve: [],
        createdAt: new Date().toISOString(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        backtestId,
        symbol,
        strategy: strategyName,
        strategyDefinition: null,
        entryDate,
        exitDate,
        status: 'error',
        error: errorMessage,
        trades: [],
        metrics: getEmptyMetrics(),
        pnlCurve: [],
        createdAt: new Date().toISOString(),
      }
    }
  }
}

/**
 * Calculate metrics from trades
 */
function calculateMetrics(trades: BacktestTrade[]): BacktestMetrics {
  if (trades.length === 0) {
    return getEmptyMetrics()
  }

  const winners = trades.filter(t => t.status === 'winner')
  const losers = trades.filter(t => t.status === 'loser')
  const breakEvens = trades.filter(t => t.status === 'breakeven')

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const winPnL = winners.reduce((sum, t) => sum + t.pnl, 0)
  const lossPnL = losers.reduce((sum, t) => sum + t.pnl, 0)

  const avgWin = winners.length > 0 ? winPnL / winners.length : 0
  const avgLoss = losers.length > 0 ? Math.abs(lossPnL) / losers.length : 0
  const avgPnL = totalPnL / trades.length

  // Calculate profit factor
  const profitFactor = Math.abs(lossPnL) > 0 ? winPnL / Math.abs(lossPnL) : lossPnL === 0 ? Infinity : 0

  // Calculate win rate
  const winRate = (winners.length / trades.length) * 100

  // Calculate max drawdown (simplified - real calculation would track equity curve)
  let maxDrawdown = 0
  let peak = 0
  for (const trade of trades) {
    peak = Math.max(peak, trade.pnl)
    maxDrawdown = Math.max(maxDrawdown, peak - trade.pnl)
  }

  // Calculate Sharpe ratio (simplified - assumes daily returns)
  const returns = trades.map(t => t.pnlPercent)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0

  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0
  let maxConsecutiveLosses = 0
  let currentWins = 0
  let currentLosses = 0

  for (const trade of trades) {
    if (trade.status === 'winner') {
      currentWins++
      currentLosses = 0
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins)
    } else if (trade.status === 'loser') {
      currentLosses++
      currentWins = 0
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses)
    }
  }

  return {
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    breakEvenTrades: breakEvens.length,
    winRate,
    profitFactor,
    totalPnL,
    avgPnL,
    avgWin,
    avgLoss,
    maxDrawdown,
    sharpeRatio,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  }
}

/**
 * Get empty metrics object
 */
function getEmptyMetrics(): BacktestMetrics {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    winRate: 0,
    profitFactor: 0,
    totalPnL: 0,
    avgPnL: 0,
    avgWin: 0,
    avgLoss: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
  }
}

/**
 * Export backtest engine singleton
 */
export const backtestEngine = new BacktestEngine()
export default backtestEngine
