import { Router } from 'express'
import {
  getSymbols,
  getExpirations,
  getStrikes,
  getOptionsChain,
} from '../controllers/discoveryController.js'

const router = Router()

/**
 * Discovery Endpoints - ThetaData integration for symbol/expiration/strike discovery
 */

// GET /api/symbols - Get all available symbols
router.get('/symbols', getSymbols)

// GET /api/expirations/:symbol - Get all expirations for a symbol
router.get('/expirations/:symbol', getExpirations)

// GET /api/strikes/:symbol/:expiration - Get all strikes for symbol/expiration
router.get('/strikes/:symbol/:expiration', getStrikes)

// GET /api/options-chain/:symbol/:expiration - Get full call/put chain
router.get('/options-chain/:symbol/:expiration', getOptionsChain)

export default router
