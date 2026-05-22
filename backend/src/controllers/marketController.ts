import { Request, Response } from 'express';
import { flashAlphaClient, GEXData, GreeksData, GammaFlipData, OptionsWallsData, VolumeOIData } from '../api/flashalpha-client.js';
import logger from '../utils/logger.js';
import { cache } from '../utils/cache.js';
import { dedup } from '../utils/requestDedup.js';
import { parseStrikeFilter, filterGreeks, filterWalls, filterVolumeOI } from '../utils/strikeFilter.js';

/**
 * Market Controller
 * Handles all market data endpoints
 */

/**
 * GET /api/market/gex/:symbol
 * Get GEX (Gamma Exposure) data for a symbol
 * Cached for 5 minutes per symbol
 */
export const getGEX = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { strike } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `market:${upperSymbol}:gex:${strike || 'all'}`;

    // Check cache first
    let gexData = cache.get<GEXData>(cacheKey);

    if (!gexData) {
      // Cache miss - fetch from API with deduplication
      gexData = await dedup.execute(`gex:${cacheKey}`, async () => {
        return await flashAlphaClient.getGEX(
          upperSymbol,
          strike ? parseInt(strike as string) : undefined
        );
      });

      if (gexData) {
        // Store in cache for 5 minutes (300 seconds)
        cache.set(cacheKey, gexData, 300);
      }
    }

    if (!gexData) {
      return res.status(404).json({
        success: false,
        error: `No GEX data found for ${symbol}`,
      });
    }

    res.json({
      success: true,
      data: gexData,
      cached: cache.has(cacheKey),
    });
  } catch (error) {
    logger.error('Error in getGEX endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GEX data',
    });
  }
};

/**
 * GET /api/market/greeks/:symbol
 * Get all Greeks data for a symbol
 */
export const getGreeks = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const greeksData = await flashAlphaClient.getGreeksBySymbol(symbol.toUpperCase());

    res.json({
      success: true,
      data: greeksData,
      count: greeksData.length,
    });
  } catch (error) {
    console.error('❌ Error in getGreeks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Greeks data',
    });
  }
};

/**
 * GET /api/market/gamma-flip/:symbol
 * Get Gamma Flip data (potential reversal points)
 */
export const getGammaFlip = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const flipData = await flashAlphaClient.getGammaFlip(symbol.toUpperCase());

    if (!flipData) {
      return res.status(404).json({
        success: false,
        error: `No Gamma Flip data found for ${symbol}`,
      });
    }

    res.json({
      success: true,
      data: flipData,
    });
  } catch (error) {
    console.error('❌ Error in getGammaFlip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Gamma Flip data',
    });
  }
};

/**
 * GET /api/market/walls/:symbol
 * Get Options Walls (Put/Call wall strength)
 */
export const getOptionsWalls = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { strike } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const wallsData = await flashAlphaClient.getOptionsWalls(
      symbol.toUpperCase(),
      strike ? parseInt(strike as string) : undefined
    );

    res.json({
      success: true,
      data: wallsData,
      count: wallsData.length,
    });
  } catch (error) {
    console.error('❌ Error in getOptionsWalls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Options Walls data',
    });
  }
};

/**
 * GET /api/market/volume-oi/:symbol
 * Get Volume and Open Interest data
 */
export const getVolumeAndOI = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const voiData = await flashAlphaClient.getVolumeAndOI(symbol.toUpperCase());

    res.json({
      success: true,
      data: voiData,
      count: voiData.length,
    });
  } catch (error) {
    console.error('❌ Error in getVolumeAndOI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Volume/OI data',
    });
  }
};

/**
 * GET /api/market/data/:symbol
 * Get all market data combined (GEX + Greeks + Walls + OI)
 * Main endpoint for comprehensive market analysis
 * Cached for 5 minutes per symbol with request deduplication
 *
 * Query Parameters (Sprint 2: Payload Filtering):
 * - strikeMin: Minimum strike price to return
 * - strikeMax: Maximum strike price to return
 * - strikeRange: Percentage range around current price (default: 20)
 *   Example: ?strikeRange=25 returns ATM ± 25%
 *
 * Default behavior: ATM ± 20% (reduces 100+ rows to 10-20 rows = 80-90% reduction)
 */
export const getMarketData = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const upperSymbol = symbol.toUpperCase();

    // Extract strike filter parameters (Sprint 2: Payload Filtering)
    const strikeMin = Array.isArray(req.query.strikeMin)
      ? (req.query.strikeMin[0] as string)
      : (req.query.strikeMin as string | undefined);
    const strikeMax = Array.isArray(req.query.strikeMax)
      ? (req.query.strikeMax[0] as string)
      : (req.query.strikeMax as string | undefined);
    const strikeRange = Array.isArray(req.query.strikeRange)
      ? (req.query.strikeRange[0] as string)
      : (req.query.strikeRange as string | undefined);

    // Build cache key including filter parameters
    const filterKey =
      strikeMin || strikeMax || strikeRange
        ? `_filter${strikeMin || 'all'}_${strikeMax || 'all'}`
        : '';
    const cacheKey = `market:${upperSymbol}:all${filterKey}`;

    // Check cache first
    let marketData = cache.get<typeof flashAlphaClient.getMarketData extends (...args: any[]) => Promise<infer R> ? R : never>(cacheKey);
    let fromCache = false;

    if (!marketData) {
      // Cache miss - fetch from API with deduplication
      // This prevents multiple simultaneous requests for the same symbol
      const freshData = await dedup.execute(cacheKey, async () => {
        return await flashAlphaClient.getMarketData(upperSymbol);
      });

      marketData = freshData as any;

      if (marketData) {
        // Store in cache for 5 minutes (300 seconds)
        cache.set(cacheKey, marketData, 300);
      }
    } else {
      fromCache = true;
    }

    if (marketData) {
      // Parse strike filter parameters (Sprint 2: Performance Optimization)
      const strikeFilter = parseStrikeFilter({
        strikeMin,
        strikeMax,
        strikeRange,
      }, (marketData as any).gex?.strike || undefined);

      // Apply strike filtering to reduce payload (80-90% reduction)
      const filteredGreeks = filterGreeks((marketData as any).greeks, strikeFilter);
      const filteredWalls = filterWalls((marketData as any).walls, strikeFilter);
      const filteredVolumeOI = filterVolumeOI((marketData as any).volumeOI, strikeFilter);

      res.json({
        success: true,
        data: {
          symbol: upperSymbol,
          gex: (marketData as any).gex,
          gammaFlip: (marketData as any).gammaFlip,
          greeks: {
            count: filteredGreeks.length,
            items: filteredGreeks,
          },
          walls: {
            count: filteredWalls.length,
            items: filteredWalls,
          },
          volumeOI: {
            count: filteredVolumeOI.length,
            items: filteredVolumeOI,
          },
          strikeFilter: strikeFilter ? {
            min: strikeFilter.strikeMin,
            max: strikeFilter.strikeMax,
            applied: true,
          } : {
            applied: false,
          },
          timestamp: new Date().toISOString(),
        },
        cached: fromCache,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch market data',
      });
    }
  } catch (error) {
    logger.error('Error in getMarketData endpoint', {
      symbol: req.params.symbol,
      strikeMin: req.query.strikeMin,
      strikeMax: req.query.strikeMax,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
    });
  }
};

/**
 * GET /api/market/health
 * Check FlashAlpha API health
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const isHealthy = await flashAlphaClient.healthCheck();

    res.json({
      success: isHealthy,
      status: isHealthy ? 'FlashAlpha API is healthy' : 'FlashAlpha API is unavailable',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in healthCheck:', error);
    res.status(500).json({
      success: false,
      status: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/market/stats
 * Get API usage statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = flashAlphaClient.getStats();

    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error in getStats endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
};

/**
 * GET /api/market/cache/stats
 * Get cache performance statistics
 */
export const getCacheStats = async (req: Request, res: Response) => {
  try {
    const cacheStats = cache.getStats();
    const dedupStats = dedup.getStats();

    res.json({
      success: true,
      data: {
        cache: cacheStats,
        deduplication: dedupStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error in getCacheStats endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics',
    });
  }
};

/**
 * POST /api/market/cache/clear
 * Clear cache (useful for testing or manual refresh)
 */
export const clearCache = async (req: Request, res: Response) => {
  try {
    const pattern = (req.query.pattern as string) || '*';

    if (pattern === '*') {
      cache.clear();
      logger.info('Cache cleared by admin request');
      res.json({
        success: true,
        message: 'All cache entries cleared',
      });
    } else {
      const invalidated = cache.invalidate(pattern);
      logger.info('Cache entries invalidated by admin request', {
        pattern,
        invalidated,
      });
      res.json({
        success: true,
        message: `${invalidated} cache entries invalidated`,
        pattern,
      });
    }
  } catch (error) {
    logger.error('Error in clearCache endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
};
