import { Router } from 'express'
import {
  runBacktest,
  getBacktestResults,
  listBacktests,
  getAvailableStrategies,
} from '../controllers/backtestController.js'

const router = Router()

/**
 * Backtesting Endpoints - Options strategy backtesting using ThetaData historical data
 */

// POST /api/backtest/run - Run a new backtest
// Body: { symbol: "SPY", strategy: "iron_condor", entryDate: "2026-01-15", exitDate: "2026-02-15", parameters: {} }
router.post('/backtest/run', runBacktest)

// GET /api/backtest/strategies - Get available strategies (MUST come before :backtestId)
router.get('/backtest/strategies', getAvailableStrategies)

// GET /api/backtest/:backtestId - Get backtest results by ID
router.get('/backtest/:backtestId', getBacktestResults)

// GET /api/backtests - List all backtests
router.get('/backtests', listBacktests)

export default router
