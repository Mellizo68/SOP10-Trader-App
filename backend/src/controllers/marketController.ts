import { Request, Response } from 'express';
import { flashAlphaClient, GEXData, GreeksData, GammaFlipData, OptionsWallsData, VolumeOIData } from '../api/flashalpha-client';
// TODO: Phase 9 - ThetaData client integration
// import { thetaDataClient } from '../api/thetadata-client';
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
 *
 * Error Recovery: Real API → Cached data → Error response
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
    let fromCache = false;
    let apiError: Error | null = null;

    if (!gexData) {
      // Cache miss - fetch from API with deduplication
      try {
        const { dedup } = await import('../utils/requestDedup.js');
        gexData = await dedup.execute(`gex:${cacheKey}`, async () => {
          return await flashAlphaClient.getGEX(
            upperSymbol,
            strike ? parseInt(strike as string) : undefined
          );
        });

        if (gexData) {
          // Store in cache for 5 minutes (300 seconds)
          cache.set(cacheKey, gexData, 300);
          logger.debug('GEX data fetched from FlashAlpha', {
            symbol: upperSymbol,
          });
        }
      } catch (error) {
        apiError = error instanceof Error ? error : new Error(String(error));
        logger.warn('FlashAlpha GEX call failed', {
          symbol: upperSymbol,
          error: apiError.message,
        });

        // Try to get cached data (ignore TTL)
        gexData = cache.get<GEXData>(cacheKey, true);
        if (gexData) {
          fromCache = true;
          logger.info('Using stale cached GEX data', {
            symbol: upperSymbol,
          });
        }
      }
    } else {
      fromCache = true;
    }

    if (!gexData) {
      logger.error('No GEX data available', {
        symbol: upperSymbol,
        apiError: apiError?.message,
      });
      return res.status(503).json({
        success: false,
        error: `No GEX data available for ${symbol}`,
        ...(apiError && { details: apiError.message }),
      });
    }

    res.json({
      success: true,
      data: gexData,
      cached: fromCache,
      ...(fromCache && apiError && { warning: 'Using cached data - API is unavailable' }),
    });
  } catch (error) {
    logger.error('Error in getGEX endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error processing GEX request',
    });
  }
};

/**
 * GET /api/market/greeks/:symbol
 * Get all Greeks data for a symbol
 * Cached for 5 minutes per symbol
 *
 * Error Recovery: Real API → Cached data → Error response
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
    let fromCache = false;
    let apiError: Error | null = null;

    if (!greeksData) {
      // Cache miss - fetch from API with deduplication
      try {
        const { dedup } = await import('../utils/requestDedup.js');
        greeksData = await dedup.execute(`greeks:${cacheKey}`, async () => {
          return await flashAlphaClient.getGreeksBySymbol(upperSymbol);
        });

        if (greeksData) {
          // Store in cache for 5 minutes (300 seconds)
          cache.set(cacheKey, greeksData, 300);
          logger.debug('Greeks data fetched from FlashAlpha', {
            symbol: upperSymbol,
            count: greeksData.length,
          });
        }
      } catch (error) {
        apiError = error instanceof Error ? error : new Error(String(error));
        logger.warn('FlashAlpha Greeks call failed', {
          symbol: upperSymbol,
          error: apiError.message,
        });

        // Try to get cached data (ignore TTL)
        greeksData = cache.get<GreeksData[]>(cacheKey, true);
        if (greeksData) {
          fromCache = true;
          logger.info('Using stale cached Greeks data', {
            symbol: upperSymbol,
          });
        }
      }
    } else {
      fromCache = true;
    }

    res.json({
      success: true,
      data: greeksData || [],
      count: greeksData?.length || 0,
      cached: fromCache,
      ...(fromCache && apiError && { warning: 'Using cached data - API is unavailable' }),
    });
  } catch (error) {
    logger.error('Error in getGreeks endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error processing Greeks request',
    });
  }
};

/**
 * GET /api/market/gamma-flip/:symbol
 * Get Gamma Flip data (potential reversal points)
 * Cached for 5 minutes per symbol
 *
 * Error Recovery: Real API → Cached data → Error response
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
    let fromCache = false;
    let apiError: Error | null = null;

    if (!flipData) {
      // Cache miss - fetch from API with deduplication
      try {
        const { dedup } = await import('../utils/requestDedup.js');
        flipData = await dedup.execute(`gammaflip:${cacheKey}`, async () => {
          return await flashAlphaClient.getGammaFlip(upperSymbol);
        });

        if (flipData) {
          // Store in cache for 5 minutes (300 seconds)
          cache.set(cacheKey, flipData, 300);
          logger.debug('Gamma Flip data fetched from FlashAlpha', {
            symbol: upperSymbol,
          });
        }
      } catch (error) {
        apiError = error instanceof Error ? error : new Error(String(error));
        logger.warn('FlashAlpha Gamma Flip call failed', {
          symbol: upperSymbol,
          error: apiError.message,
        });

        // Try to get cached data (ignore TTL)
        flipData = cache.get<GammaFlipData>(cacheKey, true);
        if (flipData) {
          fromCache = true;
          logger.info('Using stale cached Gamma Flip data', {
            symbol: upperSymbol,
          });
        }
      }
    } else {
      fromCache = true;
    }

    if (!flipData) {
      logger.error('No Gamma Flip data available', {
        symbol: upperSymbol,
        apiError: apiError?.message,
      });
      return res.status(503).json({
        success: false,
        error: `No Gamma Flip data available for ${symbol}`,
        ...(apiError && { details: apiError.message }),
      });
    }

    res.json({
      success: true,
      data: flipData,
      cached: fromCache,
      ...(fromCache && apiError && { warning: 'Using cached data - API is unavailable' }),
    });
  } catch (error) {
    logger.error('Error in getGammaFlip endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error processing Gamma Flip request',
    });
  }
};

/**
 * GET /api/market/walls/:symbol
 * Get Options Walls (Put/Call wall strength)
 * Cached for 5 minutes per symbol
 *
 * Error Recovery: Real API → Cached data → Error response
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
    let fromCache = false;
    let apiError: Error | null = null;

    if (!wallsData) {
      // Cache miss - fetch from API with deduplication
      try {
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
          logger.debug('Options Walls data fetched from FlashAlpha', {
            symbol: upperSymbol,
            count: wallsData.length,
          });
        }
      } catch (error) {
        apiError = error instanceof Error ? error : new Error(String(error));
        logger.warn('FlashAlpha Options Walls call failed', {
          symbol: upperSymbol,
          error: apiError.message,
        });

        // Try to get cached data (ignore TTL)
        wallsData = cache.get<OptionsWallsData[]>(cacheKey, true);
        if (wallsData) {
          fromCache = true;
          logger.info('Using stale cached Options Walls data', {
            symbol: upperSymbol,
          });
        }
      }
    } else {
      fromCache = true;
    }

    res.json({
      success: true,
      data: wallsData || [],
      count: wallsData?.length || 0,
      cached: fromCache,
      ...(fromCache && apiError && { warning: 'Using cached data - API is unavailable' }),
    });
  } catch (error) {
    logger.error('Error in getOptionsWalls endpoint', {
      symbol: req.params.symbol,
      strike: req.query.strike,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error processing Options Walls request',
    });
  }
};

/**
 * GET /api/market/volume-oi/:symbol
 * Get Volume and Open Interest data
 * Cached for 5 minutes per symbol
 *
 * Error Recovery: Real API → Cached data → Error response
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
    let fromCache = false;
    let apiError: Error | null = null;

    if (!voiData) {
      // Cache miss - fetch from API with deduplication
      try {
        const { dedup } = await import('../utils/requestDedup.js');
        voiData = await dedup.execute(`volumeoi:${cacheKey}`, async () => {
          return await flashAlphaClient.getVolumeAndOI(upperSymbol);
        });

        if (voiData) {
          // Store in cache for 5 minutes (300 seconds)
          cache.set(cacheKey, voiData, 300);
          logger.debug('Volume/OI data fetched from FlashAlpha', {
            symbol: upperSymbol,
            count: voiData.length,
          });
        }
      } catch (error) {
        apiError = error instanceof Error ? error : new Error(String(error));
        logger.warn('FlashAlpha Volume/OI call failed', {
          symbol: upperSymbol,
          error: apiError.message,
        });

        // Try to get cached data (ignore TTL)
        voiData = cache.get<VolumeOIData[]>(cacheKey, true);
        if (voiData) {
          fromCache = true;
          logger.info('Using stale cached Volume/OI data', {
            symbol: upperSymbol,
          });
        }
      }
    } else {
      fromCache = true;
    }

    res.json({
      success: true,
      data: voiData || [],
      count: voiData?.length || 0,
      cached: fromCache,
      ...(fromCache && apiError && { warning: 'Using cached data - API is unavailable' }),
    });
  } catch (error) {
    logger.error('Error in getVolumeAndOI endpoint', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error processing Volume/OI request',
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
 *
 * Error Recovery Strategy:
 * Tier 1: Real API Call (FlashAlpha)
 * Tier 2: Cached Data (5min old is acceptable)
 * Tier 3: Error response with status 503 (Service Unavailable)
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
    let apiError: Error | null = null;

    if (!marketData) {
      // Cache miss - fetch from API with deduplication (Tier 1)
      try {
        const freshData = await dedup.execute(cacheKey, async () => {
          return await flashAlphaClient.getMarketData(upperSymbol);
        });

        marketData = freshData as any;

        if (marketData) {
          // Store in cache for 5 minutes (300 seconds)
          cache.set(cacheKey, marketData, 300);
          logger.info('Market data fetched from FlashAlpha', {
            symbol: upperSymbol,
          });
        }
      } catch (error) {
        // API call failed - try to use cached data even if stale
        apiError = error instanceof Error ? error : new Error(String(error));
        logger.warn('FlashAlpha API call failed, checking for cached data', {
          symbol: upperSymbol,
          error: apiError.message,
        });

        // Try to get ANY cached data for this symbol (ignore TTL)
        marketData = cache.get<any>(`market:${upperSymbol}:all*`, true);
        if (marketData) {
          fromCache = true;
          logger.info('Using stale cached market data', {
            symbol: upperSymbol,
          });
        }
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
        ...(fromCache && apiError && { warning: 'Using cached data - API is unavailable' }),
      });
    } else {
      // No data available (Tier 3)
      logger.error('No market data available', {
        symbol: upperSymbol,
        apiError: apiError?.message,
      });

      res.status(503).json({
        success: false,
        error: 'FlashAlpha API unavailable and no cached data available',
        ...(apiError && { details: apiError.message }),
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
      error: 'Internal server error processing market data request',
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

/**
 * GET /api/market/historical/:symbol
 * Get historical options data for a symbol
 * Query params: startDate, endDate, expiration (required), strike, optionType (call|put)
 *
 * Example: /api/market/historical/SPY?startDate=2026-05-01&endDate=2026-05-24&expiration=2026-06-20
 */
export const getHistoricalOptions = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { startDate, endDate, expiration, strike, optionType } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    if (!expiration) {
      return res.status(400).json({
        success: false,
        error: 'expiration is required (format: YYYY-MM-DD). Use /api/market/chain/:symbol to see available expirations',
      });
    }

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `theta:hist:${upperSymbol}:${startDate}:${endDate}:${expiration}:${strike || 'all'}:${optionType || 'all'}`;

    // Check cache first (24 hour TTL for historical)
    let historicalData = cache.get(cacheKey);
    if (historicalData) {
      logger.debug('Historical options from cache', { symbol, expiration });
      return res.json({
        success: true,
        data: historicalData,
        cached: true,
      });
    }

    // TODO: Phase 9 - ThetaData API integration
    return res.status(501).json({
      success: false,
      error: 'Historical options are under development (Phase 9). Requires ThetaData API integration.',
      code: 501,
    });
  } catch (error) {
    logger.error('Error fetching historical options', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      success: false,
      error: 'Failed to fetch historical options',
    });
  }
};

/**
 * GET /api/market/volatility/:symbol
 * Get volatility analysis for a symbol
 * Query params: startDate, endDate
 *
 * Example: /api/market/volatility/SPY?startDate=2026-05-01&endDate=2026-05-24
 */
export const getVolatility = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { startDate, endDate } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `theta:vol:${upperSymbol}:${startDate || 'all'}:${endDate || 'all'}`;

    // Check cache first (1 hour TTL for volatility)
    let volatilityData = cache.get(cacheKey);
    if (volatilityData) {
      logger.debug('Volatility data from cache', { symbol });
      return res.json({
        success: true,
        data: volatilityData,
        cached: true,
      });
    }

    // TODO: Phase 9 - ThetaData API integration
    return res.status(501).json({
      success: false,
      error: 'Volatility data is under development (Phase 9). Requires ThetaData API integration.',
      code: 501,
    });
  } catch (error) {
    logger.error('Error fetching volatility data', {
      symbol: req.params.symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      success: false,
      error: 'Failed to fetch volatility data',
    });
  }
};

/**
 * GET /api/market/chain/:symbol/:expiration
 * Get options chain for a specific expiration
 *
 * Example: /api/market/chain/SPY/2026-06-20
 */
export const getOptionsChain = async (req: Request, res: Response) => {
  try {
    const { symbol, expiration } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    if (!expiration) {
      return res.status(400).json({
        success: false,
        error: 'Expiration date is required',
      });
    }

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `theta:chain:${upperSymbol}:${expiration}`;

    // Check cache first (30 minute TTL for chain)
    let chainData = cache.get(cacheKey);
    if (chainData) {
      logger.debug('Options chain from cache', { symbol, expiration });
      return res.json({
        success: true,
        data: chainData,
        cached: true,
      });
    }

    // ThetaData integration pending (Phase 9)
    res.status(501).json({
      success: false,
      error: 'Options chain endpoint not yet implemented',
    });
  } catch (error) {
    logger.error('Error fetching options chain', {
      symbol: req.params.symbol,
      expiration: req.params.expiration,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      success: false,
      error: 'Failed to fetch options chain',
    });
  }
};
