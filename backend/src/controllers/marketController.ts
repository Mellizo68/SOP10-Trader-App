import { Request, Response } from 'express';
import { flashAlphaClient, GEXData, GreeksData, GammaFlipData, OptionsWallsData, VolumeOIData } from '../api/flashalpha-client';
import logger from '../utils/logger';
import { cache } from '../utils/cache';
//import { dedup } from '../utils/requestDedup';// import { dedup } from '../utils/requestDedup';
import { parseStrikeFilter, filterGreeks, filterWalls, filterVolumeOI } from '../utils/strikeFilter';

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
      const { dedup } = await import('../utils/requestDedup.js');
      gexData = await dedup.execute(`gex:${cacheKey}`, async () => {// import { dedup } from '../utils/requestDedup';
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
 * Cached for 5 minutes per symbol
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

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `market:${upperSymbol}:greeks`;

    // Check cache first
    let greeksData = cache.get<GreeksData[]>(cacheKey);

    if (!greeksData) {
      // Cache miss - fetch from API with deduplication
      const { dedup } = await import('../utils/requestDedup.js');
      greeksData = await dedup.execute(`greeks:${cacheKey}`, async () => {
        return await flashAlphaClient.getGreeksBySymbol(upperSymbol);
      });

      if (greeksData) {
        // Store in cache for 5 minutes (300 seconds)
        cache.set(cacheKey, greeksData, 300);
      }
    }

    res.json({
      success: true,
      data: greeksData,
      count: greeksData?.length || 0,
      cached: cache.has(cacheKey),
    });
  } catch (error) {
    logger.error('Error in getGreeks endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Greeks data',
    });
  }
};

/**
 * GET /api/market/gamma-flip/:symbol
 * Get Gamma Flip data (potential reversal points)
 * Cached for 5 minutes per symbol
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

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `market:${upperSymbol}:gammaflip`;

    // Check cache first
    let flipData = cache.get<GammaFlipData>(cacheKey);

    if (!flipData) {
      // Cache miss - fetch from API with deduplication
      const { dedup } = await import('../utils/requestDedup.js');
      flipData = await dedup.execute(`gammaflip:${cacheKey}`, async () => {
        return await flashAlphaClient.getGammaFlip(upperSymbol);
      });

      if (flipData) {
        // Store in cache for 5 minutes (300 seconds)
        cache.set(cacheKey, flipData, 300);
      }
    }

    if (!flipData) {
      return res.status(404).json({
        success: false,
        error: `No Gamma Flip data found for ${symbol}`,
      });
    }

    res.json({
      success: true,
      data: flipData,
      cached: cache.has(cacheKey),
    });
  } catch (error) {
    logger.error('Error in getGammaFlip endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Gamma Flip data',
    });
  }
};

/**
 * GET /api/market/walls/:symbol
 * Get Options Walls (Put/Call wall strength)
 * Cached for 5 minutes per symbol
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

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `market:${upperSymbol}:walls:${strike || 'all'}`;

    // Check cache first
    let wallsData = cache.get<OptionsWallsData[]>(cacheKey);

    if (!wallsData) {
      // Cache miss - fetch from API with deduplication
      const { dedup } = await import('../utils/requestDedup.js');
      wallsData = await dedup.execute(`walls:${cacheKey}`, async () => {
        return await flashAlphaClient.getOptionsWalls(
          upperSymbol,
          strike ? parseInt(strike as string) : undefined
        );
      });

      if (wallsData) {
        // Store in cache for 5 minutes (300 seconds)
        cache.set(cacheKey, wallsData, 300);
      }
    }

    res.json({
      success: true,
      data: wallsData,
      count: wallsData?.length || 0,
      cached: cache.has(cacheKey),
    });
  } catch (error) {
    logger.error('Error in getOptionsWalls endpoint', {
      symbol: req.params.symbol,
      strike: req.query.strike,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Options Walls data',
    });
  }
};

/**
 * GET /api/market/volume-oi/:symbol
 * Get Volume and Open Interest data
 * Cached for 5 minutes per symbol
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

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `market:${upperSymbol}:volumeoi`;

    // Check cache first
    let voiData = cache.get<VolumeOIData[]>(cacheKey);

    if (!voiData) {
      // Cache miss - fetch from API with deduplication
      const { dedup } = await import('../utils/requestDedup.js');
      voiData = await dedup.execute(`volumeoi:${cacheKey}`, async () => {
        return await flashAlphaClient.getVolumeAndOI(upperSymbol);
      });

      if (voiData) {
        // Store in cache for 5 minutes (300 seconds)
        cache.set(cacheKey, voiData, 300);
      }
    }

    res.json({
      success: true,
      data: voiData,
      count: voiData?.length || 0,
      cached: cache.has(cacheKey),
    });
  } catch (error) {
    logger.error('Error in getVolumeAndOI endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
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
    const { cache } = await import('../utils/cache.js');
    const { dedup } = await import('../utils/requestDedup.js');
    let marketData = cache.get<typeof flashAlphaClient.getMarketData extends (...args: any[]) => Promise<infer R> ? R : never>(cacheKey);
    let fromCache = false;

    if (!marketData) {
      // Cache miss - fetch from API with deduplication
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
    const { dedup } = await import('../utils/requestDedup.js');
    const cacheStats = cache.getStats();
    const dedupStats = dedup.getStats();

    res.json({
      success: true,
      data: {
        cache: cacheStats,
        deduplication: dedupStats,// import { dedup } from '../utils/requestDedup';
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
