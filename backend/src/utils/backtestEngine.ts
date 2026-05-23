import { HistoricalOptionsData } from '../../../mcp-server-bebeto/dist/utils/types.js'
import { getStrategy, StrategyDefinition, calculatePnL } from './strategyLib.js'

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

      // Simulate backtest with available data
      const trades: BacktestTrade[] = []
      const pnlCurve: { date: string; cumulativePnL: number }[] = []

      // For now, create a simple backtest result
      // In production, this would analyze historical data and generate trades
      let cumulativePnL = 0

      // Calculate average prices for each strike
      const strikePrices = Object.keys(historicalData)
      if (strikePrices.length === 0) {
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
      }

      // Simulate entry on first date
      const entryData: { [strikePrice: number]: number } = {}
      const exitData: { [strikePrice: number]: number } = {}

      for (const strikeKey of strikePrices) {
        const data = historicalData[strikeKey]
        if (data && data.length > 0) {
          const strikePrice = data[0].strike
          const entryPrice = data[0].close
          const exitPrice = data[data.length - 1].close

          entryData[strikePrice] = entryPrice
          exitData[strikePrice] = exitPrice
        }
      }

      // Calculate strategy P&L
      if (Object.keys(entryData).length > 0) {
        const atmPrice = Math.min(...Object.keys(entryData).map(Number)) || 100
        const premiums = entryData
        const exitPremiums = exitData

        const entryPnL = calculatePnL(strategy, atmPrice, premiums, atmPrice)
        const exitPnL = calculatePnL(strategy, atmPrice, exitPremiums, atmPrice)
        const pnl = exitPnL - entryPnL

        if (pnl !== 0) {
          const daysHeld = 1 // Simplified
          trades.push({
            entryDate,
            entryPrice: entryPnL,
            entryLegPrices: entryData,
            exitDate,
            exitPrice: exitPnL,
            exitLegPrices: exitData,
            pnl,
            pnlPercent: (pnl / Math.abs(entryPnL)) * 100,
            daysHeld,
            status: pnl > 0 ? 'winner' : pnl < 0 ? 'loser' : 'breakeven',
          })

          cumulativePnL += pnl
        }
      }

      pnlCurve.push({
        date: exitDate,
        cumulativePnL,
      })

      // Calculate metrics
      const metrics = calculateMetrics(trades)

      return {
        backtestId,
        symbol,
        strategy: strategyName,
        strategyDefinition: strategy,
        entryDate,
        exitDate,
        status: 'completed',
        trades,
        metrics,
        pnlCurve,
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
