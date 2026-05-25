import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger.js'

/**
 * Store for completed backtests (in-memory, for MVP)
 * In production, this would be a database
 */
const backtestResults: Map<string, any> = new Map()

/**
 * Run a backtest for a specific strategy and symbol
 * TODO: Phase 9 - Requires ThetaData API integration
 */
export async function runBacktest(req: Request, res: Response): Promise<void> {
  try {
    res.status(501).json({
      success: false,
      error: 'Backtest feature is under development (Phase 9). Requires ThetaData API integration.',
      code: 501,
    })
    return
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
    const backtests = Array.from(backtestResults.entries()).map(([id, result]) => ({
      id,
      status: result.status,
      symbol: result.symbol,
      strategy: result.strategy,
    }))

    res.json({
      success: true,
      data: backtests,
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
 * Get available strategies for backtesting
 * TODO: Phase 9 - Requires strategy configuration
 */
export async function getAvailableStrategies(req: Request, res: Response): Promise<void> {
  try {
    res.status(501).json({
      success: false,
      error: 'Strategy management is under development (Phase 9).',
      code: 501,
    })
  } catch (error) {
    logger.error('Error getting strategies:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get strategies',
    })
  }
}
