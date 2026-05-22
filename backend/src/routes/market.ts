import { Router } from 'express';
import {
  getGEX,
  getGreeks,
  getGammaFlip,
  getOptionsWalls,
  getVolumeAndOI,
  getMarketData,
  healthCheck,
  getStats,
  getCacheStats,
  clearCache,
} from '../controllers/marketController.js';

const router = Router();

/**
 * Market Data Routes
 */

// Health check
router.get('/health', healthCheck);

// API statistics
router.get('/stats', getStats);

// Cache statistics (Sprint 1: Performance Optimization)
router.get('/cache/stats', getCacheStats);

// Cache management (Sprint 1: Performance Optimization)
router.post('/cache/clear', clearCache);

// GEX (Gamma Exposure)
router.get('/gex/:symbol', getGEX);

// Greeks (Delta, Gamma, Theta, Vega, IV)
router.get('/greeks/:symbol', getGreeks);

// Gamma Flip (reversal points)
router.get('/gamma-flip/:symbol', getGammaFlip);

// Options Walls (Put/Call support/resistance)
router.get('/walls/:symbol', getOptionsWalls);

// Volume and Open Interest
router.get('/volume-oi/:symbol', getVolumeAndOI);

// Combined market data (all data for a symbol)
router.get('/data/:symbol', getMarketData);

export default router;
