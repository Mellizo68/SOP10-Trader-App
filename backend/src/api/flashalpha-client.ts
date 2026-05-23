import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

/**
 * FlashAlpha API Response Types
 */

export interface GEXData {
  symbol: string;
  strike?: number;
  gex: number;
  gexPercent: number;
  gammaFlip?: boolean;
  timestamp: string;
}

export interface GreeksData {
  symbol: string;
  strike: number;
  expiration: string;
  optionType: 'call' | 'put';
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  price: number;
  timestamp: string;
}

export interface GammaFlipData {
  symbol: string;
  flipLevel: number;
  direction: 'up' | 'down' | 'neutral';
  strength: number;
  timestamp: string;
}

export interface OptionsWallsData {
  symbol: string;
  strikePrice: number;
  putWall: {
    contracts: number;
    level: string; // 'strong' | 'moderate' | 'weak'
  };
  callWall: {
    contracts: number;
    level: string; // 'strong' | 'moderate' | 'weak'
  };
  timestamp: string;
}

export interface VolumeOIData {
  symbol: string;
  strikePrice: number;
  expiration: string;
  callOI: number;
  callVolume: number;
  putOI: number;
  putVolume: number;
  timestamp: string;
}

export interface MarketDataResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * FlashAlpha Client
 *
 * Handles all interactions with FlashAlpha API for:
 * - GEX (Gamma Exposure) data
 * - Greeks (Delta, Gamma, Theta, Vega, IV)
 * - Gamma flip levels and trends
 * - Options walls (Put/Call)
 * - Open Interest and Volume
 */
class FlashAlphaClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private requestCount = 0;
  private lastRequestTime = 0;
  private rateLimitDelay = 200; // ms between requests
  private timeoutCount = 0; // Track timeout errors
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor() {
    this.apiKey = process.env.FLASHALPHA_API_KEY || '';
    this.baseUrl = process.env.FLASHALPHA_BASE_URL || 'https://lab.flashalpha.com/api/v1';

    if (!this.apiKey) {
      logger.warn('FlashAlpha API key not configured', {
        env: 'FLASHALPHA_API_KEY',
      });
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: this.REQUEST_TIMEOUT,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        // Handle timeout errors
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          this.timeoutCount++;
          logger.error('FlashAlpha timeout', {
            timeout: this.REQUEST_TIMEOUT,
            url: error.config?.url,
            timeoutCount: this.timeoutCount,
          });
        } else if (error.response?.status === 401) {
          logger.error('FlashAlpha authentication failed', {
            status: 401,
            url: error.config?.url,
          });
        } else if (error.response?.status === 429) {
          logger.warn('FlashAlpha rate limit exceeded', {
            status: 429,
            url: error.config?.url,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Get GEX (Gamma Exposure) data for a symbol
   * Returns aggregate net gamma position
   */
  async getGEX(symbol: string, strike?: number): Promise<GEXData | null> {
    try {
      await this.enforceRateLimit();

      const params: any = { symbol };
      if (strike) {
        params.strike = strike;
      }

      const response = await this.client.get('/gex', { params });

      if (response.status === 200 && response.data) {
        logger.debug('GEX data received', {
          symbol,
          strike,
          gex: response.data.gex,
        });

        return {
          symbol: response.data.symbol || symbol,
          strike: response.data.strike,
          gex: response.data.gex || 0,
          gexPercent: response.data.gexPercent || 0,
          gammaFlip: response.data.gammaFlip || false,
          timestamp: new Date().toISOString(),
        };
      }

      logger.warn('Empty GEX response from API', { symbol, strike });
      return null;
    } catch (error) {
      // In production, throw error so controller can handle gracefully
      // In development, optionally fall back to mock (controlled by FLASHALPHA_FALLBACK env var)
      const shouldFallbackToMock = process.env.NODE_ENV === 'development' &&
                                   process.env.FLASHALPHA_FALLBACK === 'mock';

      if (shouldFallbackToMock) {
        logger.warn('Falling back to mock GEX data', {
          symbol,
          reason: error instanceof Error ? error.message : String(error),
        });
        return this.generateMockGEX(symbol);
      }

      // Throw error with detailed context for controller to handle
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching GEX from FlashAlpha', {
        symbol,
        strike,
        error: errorMessage,
        status: (error as any).response?.status,
      });
      throw error;
    }
  }

  /**
   * Get Greeks data for specific option
   */
  async getGreeks(
    symbol: string,
    strike: number,
    expiration: string,
    optionType: 'call' | 'put'
  ): Promise<GreeksData | null> {
    try {
      await this.enforceRateLimit();

      const params = {
        symbol,
        strike,
        expiration,
        type: optionType,
      };

      const response = await this.client.get('/greeks', { params });

      if (response.status === 200 && response.data) {
        return {
          symbol: response.data.symbol || symbol,
          strike: response.data.strike || strike,
          expiration: response.data.expiration || expiration,
          optionType: response.data.type === 'call' ? 'call' : 'put',
          delta: response.data.delta || 0,
          gamma: response.data.gamma || 0,
          theta: response.data.theta || 0,
          vega: response.data.vega || 0,
          iv: response.data.iv || 0,
          price: response.data.price || 0,
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching Greeks', {
        symbol,
        strike,
        expiration,
        optionType,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get all Greeks for a symbol across expirations
   */
  async getGreeksBySymbol(symbol: string): Promise<GreeksData[]> {
    try {
      await this.enforceRateLimit();

      const response = await this.client.get(`/greeks/${symbol}`);

      if (response.status === 200 && Array.isArray(response.data)) {
        logger.debug('Greeks data received', {
          symbol,
          count: response.data.length,
        });

        return response.data.map((item: any) => ({
          symbol: item.symbol || symbol,
          strike: item.strike,
          expiration: item.expiration,
          optionType: item.type === 'call' ? 'call' : 'put',
          delta: item.delta || 0,
          gamma: item.gamma || 0,
          theta: item.theta || 0,
          vega: item.vega || 0,
          iv: item.iv || 0,
          price: item.price || 0,
          timestamp: new Date().toISOString(),
        }));
      }

      logger.warn('Empty Greeks response from API', { symbol });
      return [];
    } catch (error) {
      // In production, throw error so controller can handle gracefully
      // In development, optionally fall back to mock (controlled by FLASHALPHA_FALLBACK env var)
      const shouldFallbackToMock = process.env.NODE_ENV === 'development' &&
                                   process.env.FLASHALPHA_FALLBACK === 'mock';

      if (shouldFallbackToMock) {
        logger.warn('Falling back to mock Greeks data', {
          symbol,
          reason: error instanceof Error ? error.message : String(error),
        });
        return this.generateMockGreeks(symbol);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching Greeks from FlashAlpha', {
        symbol,
        error: errorMessage,
        status: (error as any).response?.status,
      });
      throw error;
    }
  }

  /**
   * Get Gamma Flip levels and trend
   * Indicates potential reversal points
   */
  async getGammaFlip(symbol: string): Promise<GammaFlipData | null> {
    try {
      await this.enforceRateLimit();

      const response = await this.client.get(`/gamma-flip/${symbol}`);

      if (response.status === 200 && response.data) {
        logger.debug('Gamma Flip data received', {
          symbol,
          direction: response.data.direction,
        });

        return {
          symbol: response.data.symbol || symbol,
          flipLevel: response.data.flipLevel || 0,
          direction: response.data.direction || 'neutral',
          strength: response.data.strength || 0,
          timestamp: new Date().toISOString(),
        };
      }

      logger.warn('Empty Gamma Flip response from API', { symbol });
      return null;
    } catch (error) {
      const shouldFallbackToMock = process.env.NODE_ENV === 'development' &&
                                   process.env.FLASHALPHA_FALLBACK === 'mock';

      if (shouldFallbackToMock) {
        logger.warn('Falling back to mock Gamma Flip data', {
          symbol,
          reason: error instanceof Error ? error.message : String(error),
        });
        return this.generateMockGammaFlip(symbol);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching Gamma Flip from FlashAlpha', {
        symbol,
        error: errorMessage,
        status: (error as any).response?.status,
      });
      throw error;
    }
  }

  /**
   * Get Options Walls (Put/Call wall strength)
   * Indicates major support/resistance levels
   */
  async getOptionsWalls(symbol: string, strikePrice?: number): Promise<OptionsWallsData[]> {
    try {
      await this.enforceRateLimit();

      const params: any = { symbol };
      if (strikePrice) {
        params.strike = strikePrice;
      }

      const response = await this.client.get('/options-walls', { params });

      if (response.status === 200 && Array.isArray(response.data)) {
        logger.debug('Options Walls data received', {
          symbol,
          count: response.data.length,
        });

        return response.data.map((item: any) => ({
          symbol: item.symbol || symbol,
          strikePrice: item.strikePrice || item.strike,
          putWall: {
            contracts: item.putWall?.contracts || 0,
            level: item.putWall?.level || 'weak',
          },
          callWall: {
            contracts: item.callWall?.contracts || 0,
            level: item.callWall?.level || 'weak',
          },
          timestamp: new Date().toISOString(),
        }));
      }

      logger.warn('Empty Options Walls response from API', { symbol });
      return [];
    } catch (error) {
      const shouldFallbackToMock = process.env.NODE_ENV === 'development' &&
                                   process.env.FLASHALPHA_FALLBACK === 'mock';

      if (shouldFallbackToMock) {
        logger.warn('Falling back to mock Options Walls data', {
          symbol,
          reason: error instanceof Error ? error.message : String(error),
        });
        return this.generateMockWalls(symbol);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching Options Walls from FlashAlpha', {
        symbol,
        strikePrice,
        error: errorMessage,
        status: (error as any).response?.status,
      });
      throw error;
    }
  }

  /**
   * Get Open Interest and Volume data
   */
  async getVolumeAndOI(symbol: string): Promise<VolumeOIData[]> {
    try {
      await this.enforceRateLimit();

      const response = await this.client.get(`/volume-oi/${symbol}`);

      if (response.status === 200 && Array.isArray(response.data)) {
        logger.debug('Volume/OI data received', {
          symbol,
          count: response.data.length,
        });

        return response.data.map((item: any) => ({
          symbol: item.symbol || symbol,
          strikePrice: item.strikePrice || item.strike,
          expiration: item.expiration,
          callOI: item.callOI || 0,
          callVolume: item.callVolume || 0,
          putOI: item.putOI || 0,
          putVolume: item.putVolume || 0,
          timestamp: new Date().toISOString(),
        }));
      }

      logger.warn('Empty Volume/OI response from API', { symbol });
      return [];
    } catch (error) {
      const shouldFallbackToMock = process.env.NODE_ENV === 'development' &&
                                   process.env.FLASHALPHA_FALLBACK === 'mock';

      if (shouldFallbackToMock) {
        logger.warn('Falling back to mock Volume/OI data', {
          symbol,
          reason: error instanceof Error ? error.message : String(error),
        });
        return this.generateMockVolumeOI(symbol);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching Volume/OI from FlashAlpha', {
        symbol,
        error: errorMessage,
        status: (error as any).response?.status,
      });
      throw error;
    }
  }

  /**
   * Get combined market data for a symbol
   * Combines GEX + Greeks + Gamma Flip + Options Walls
   */
  async getMarketData(symbol: string): Promise<{
    gex: GEXData | null;
    gammaFlip: GammaFlipData | null;
    greeks: GreeksData[];
    walls: OptionsWallsData[];
    volumeOI: VolumeOIData[];
  }> {
    try {
      // Fetch all data in parallel
      const [gex, gammaFlip, greeks, walls, volumeOI] = await Promise.all([
        this.getGEX(symbol),
        this.getGammaFlip(symbol),
        this.getGreeksBySymbol(symbol),
        this.getOptionsWalls(symbol),
        this.getVolumeAndOI(symbol),
      ]);

      return {
        gex,
        gammaFlip,
        greeks: greeks || [],
        walls: walls || [],
        volumeOI: volumeOI || [],
      };
    } catch (error) {
      logger.error('Error getting combined market data', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        gex: null,
        gammaFlip: null,
        greeks: [],
        walls: [],
        volumeOI: [],
      };
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.enforceRateLimit();
      const response = await this.client.get('/health');

      if (response.status === 200) {
        logger.debug('FlashAlpha API health check passed');
        return true;
      }

      logger.warn('FlashAlpha health check returned non-200 status', {
        status: response.status,
      });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('FlashAlpha health check failed', {
        error: errorMessage,
        status: (error as any).response?.status,
      });
      return false;
    }
  }

  /**
   * Generate mock market data for development/testing
   */
  private generateMockGEX(symbol: string): GEXData {
    const price = 400 + Math.random() * 50;
    return {
      symbol,
      gex: Math.random() * 10000000,
      gexPercent: (Math.random() - 0.5) * 10,
      gammaFlip: Math.random() > 0.7,
      timestamp: new Date().toISOString(),
    };
  }

  private generateMockGreeks(symbol: string): GreeksData[] {
    const basePrice = 400 + Math.random() * 50;
    const strikes = [basePrice - 20, basePrice - 10, basePrice, basePrice + 10, basePrice + 20];

    return strikes.map((strike, idx) => ({
      symbol,
      strike: Math.round(strike),
      expiration: '2026-06-20',
      optionType: idx % 2 === 0 ? 'call' : 'put',
      delta: Math.random(),
      gamma: Math.random() * 0.1,
      theta: -Math.random() * 0.5,
      vega: Math.random() * 2,
      iv: 0.2 + Math.random() * 0.1,
      price: Math.random() * 20,
      timestamp: new Date().toISOString(),
    }));
  }

  private generateMockGammaFlip(symbol: string): GammaFlipData {
    return {
      symbol,
      flipLevel: 400 + Math.random() * 50,
      direction: ['up', 'down', 'neutral'][Math.floor(Math.random() * 3)] as any,
      strength: Math.random(),
      timestamp: new Date().toISOString(),
    };
  }

  private generateMockWalls(symbol: string): OptionsWallsData[] {
    const basePrice = 400 + Math.random() * 50;
    const strikes = [basePrice - 10, basePrice, basePrice + 10];

    return strikes.map(strike => ({
      symbol,
      strikePrice: Math.round(strike),
      putWall: {
        contracts: Math.floor(Math.random() * 100000),
        level: ['strong', 'moderate', 'weak'][Math.floor(Math.random() * 3)],
      },
      callWall: {
        contracts: Math.floor(Math.random() * 100000),
        level: ['strong', 'moderate', 'weak'][Math.floor(Math.random() * 3)],
      },
      timestamp: new Date().toISOString(),
    }));
  }

  private generateMockVolumeOI(symbol: string): VolumeOIData[] {
    const basePrice = 400 + Math.random() * 50;
    const strikes = [basePrice - 10, basePrice, basePrice + 10];

    return strikes.map(strike => ({
      symbol,
      strikePrice: Math.round(strike),
      expiration: '2026-06-20',
      callOI: Math.floor(Math.random() * 1000000),
      callVolume: Math.floor(Math.random() * 500000),
      putOI: Math.floor(Math.random() * 1000000),
      putVolume: Math.floor(Math.random() * 500000),
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Get API usage stats including timeout tracking
   */
  getStats(): {
    totalRequests: number;
    timeouts: number;
    rateLimitDelay: number;
    requestTimeout: number;
  } {
    return {
      totalRequests: this.requestCount,
      timeouts: this.timeoutCount,
      rateLimitDelay: this.rateLimitDelay,
      requestTimeout: this.REQUEST_TIMEOUT,
    };
  }

  /**
   * Reset request counter and timeout stats
   */
  resetStats(): void {
    this.requestCount = 0;
    this.timeoutCount = 0;
    this.lastRequestTime = 0;
  }
}

// Export singleton instance
export const flashAlphaClient = new FlashAlphaClient();

export default FlashAlphaClient;
