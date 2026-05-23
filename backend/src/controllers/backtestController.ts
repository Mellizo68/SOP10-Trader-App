import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { backtestEngine, BacktestResult } from '../utils/backtestEngine.js'
import { thetaDataClient } from '../../../mcp-server-bebeto/dist/clients/theta-data-client.js'
import logger from '../utils/logger.js'

/**
 * Store for completed backtests (in-memory, for MVP)
 * In production, this would be a database
 */
const backtestResults: Map<string, BacktestResult> = new Map()

/**
 * Run a backtest for a specific strategy and symbol
 */
export async function runBacktest(req: Request, res: Response): Promise<void> {
  try {
    const { symbol, strategy, entryDate, exitDate, parameters } = req.body

    // Validate required parameters
    if (!symbol || !strategy || !entryDate || !exitDate) {
      res.status(400).json({
        success: false,
        error: 'symbol, strategy, entryDate, and exitDate are required',
      })
      return
    }

    const backtestId = uuidv4()

    logger.info('Backtest: Starting backtest', {
      backtestId,
      symbol,
      strategy,
      entryDate,
      exitDate,
    })

    // Parse dates
    const entryDateObj = new Date(entryDate)
    const exitDateObj = new Date(exitDate)

    if (entryDateObj >= exitDateObj) {
      res.status(400).json({
        success: false,
        error: 'entryDate must be before exitDate',
      })
      return
    }

    // For MVP, return a placeholder backtest result
    // In production, this would:
    // 1. Fetch historical options data from ThetaData for the date range
    // 2. Run the backtest using the engine
    // 3. Store results in database
    // 4. Return the result

    // Simulate getting historical data
    let historicalData: { [strikeKey: string]: any[] } = {}

    try {
      // Get expirations for the symbol
      const expirations = await thetaDataClient.getExpirations(symbol)
      const relevantExp = expirations.find((exp: string) => exp >= entryDate && exp <= exitDate)

      if (!relevantExp) {
        // No relevant expiration in date range, use the closest one
        const closestExp = expirations.sort((a: string, b: string) => {
          const aDiff = Math.abs(new Date(a).getTime() - entryDateObj.getTime())
          const bDiff = Math.abs(new Date(b).getTime() - entryDateObj.getTime())
          return aDiff - bDiff
        })[0]

        if (closestExp) {
          // Get strikes for this expiration
          const strikes = await thetaDataClient.getStrikes(symbol, closestExp)

          // Get historical data for each strike
          for (const strike of strikes) {
            try {
              const data = await thetaDataClient.getHistoricalOptions(
                symbol,
                strike,
                closestExp,
                'call',
                entryDate,
                exitDate
              )
              if (data.length > 0) {
                historicalData[`${strike}_call`] = data
              }
            } catch (e) {
              // Skip if can't get data for this strike
            }
          }
        }
      }
    } catch (e) {
      logger.warn('Could not fetch historical data from ThetaData', {
        backtestId,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }

    // Run backtest
    const result = await backtestEngine.runBacktest(
      backtestId,
      symbol,
      strategy,
      entryDate,
      exitDate,
      historicalData,
      parameters
    )

    // Store result in memory
    backtestResults.set(backtestId, result)

    res.json({
      success: true,
      data: {
        backtestId,
        status: result.status,
        symbol: result.symbol,
        strategy: result.strategy,
        entryDate: result.entryDate,
        exitDate: result.exitDate,
        tradesCount: result.trades.length,
        metrics: result.metrics,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error running backtest:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run backtest',
    })
  }
}

/**
 * Get backtest results by ID
 */
export async function getBacktestResults(req: Request, res: Response): Promise<void> {
  try {
    const { backtestId } = req.params

    if (!backtestId) {
      res.status(400).json({
        success: false,
        error: 'backtestId parameter required',
      })
      return
    }

    logger.info('Backtest: Getting backtest results', { backtestId })

    const result = backtestResults.get(backtestId)

    if (!result) {
      res.status(404).json({
        success: false,
        error: `Backtest "${backtestId}" not found`,
      })
      return
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting backtest results:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get backtest results',
    })
  }
}

/**
 * List all backtests
 */
export async function listBacktests(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Backtest: Listing all backtests')

    const backtests = Array.from(backtestResults.values()).map(result => ({
      backtestId: result.backtestId,
      symbol: result.symbol,
      strategy: result.strategy,
      entryDate: result.entryDate,
      exitDate: result.exitDate,
      status: result.status,
      tradesCount: result.trades.length,
      totalPnL: result.metrics.totalPnL,
      winRate: result.metrics.winRate,
      createdAt: result.createdAt,
    }))

    res.json({
      success: true,
      data: backtests,
      total: backtests.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error listing backtests:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list backtests',
    })
  }
}

/**
 * Get available strategies
 */
export async function getAvailableStrategies(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Backtest: Getting available strategies')

    const { getAllStrategies } = await import('../utils/strategyLib.js')
    const strategies = getAllStrategies()

    res.json({
      success: true,
      data: strategies.map(s => ({
        name: s.name,
        description: s.description,
        type: s.type,
        legCount: s.legs.length,
      })),
      total: strategies.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting available strategies:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get available strategies',
    })
  }
}
