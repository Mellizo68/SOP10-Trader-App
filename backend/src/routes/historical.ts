import { Router } from 'express'
import {
  getHistoricalGreeks,
  getHistoricalSnapshot,
  getVolatility,
  getThetaDecay,
  getEarnings,
} from '../controllers/historicalController.js'

const router = Router()

/**
 * Historical Data Endpoints - ThetaData integration for Greeks history and analysis
 */

// GET /api/market/history/:symbol - Get historical Greeks over a date range
// Query: ?strike=420&expiration=2026-06-20&type=call&startDate=2026-01-01&endDate=2026-05-01
router.get('/market/history/:symbol', getHistoricalGreeks)

// GET /api/market/snapshot/:symbol/:date - Get Greeks snapshot at specific date
// Query: ?strike=420&expiration=2026-06-20&type=call
router.get('/market/snapshot/:symbol/:date', getHistoricalSnapshot)

// GET /api/volatility/:symbol - Get volatility analysis (HV, IV, Skew)
// Query: ?term=monthly
router.get('/volatility/:symbol', getVolatility)

// GET /api/theta-decay/:symbol - Get theta decay analysis
// Query: ?expiration=2026-06-20
router.get('/theta-decay/:symbol', getThetaDecay)

// GET /api/earnings/:symbol - Get earnings dates and history
router.get('/earnings/:symbol', getEarnings)

export default router
