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
        return {
          symbol: response.data.symbol || symbol,
          strike: response.data.strike,
          gex: response.data.gex || 0,
          gexPercent: response.data.gexPercent || 0,
          gammaFlip: response.data.gammaFlip || false,
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching GEX', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
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

      return [];
    } catch (error) {
      logger.error('Error fetching Greeks by symbol', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
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
        return {
          symbol: response.data.symbol || symbol,
          flipLevel: response.data.flipLevel || 0,
          direction: response.data.direction || 'neutral',
          strength: response.data.strength || 0,
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching Gamma Flip', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
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

      return [];
    } catch (error) {
      logger.error('Error fetching Options Walls', {
        symbol,
        strikePrice,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
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

      return [];
    } catch (error) {
      logger.error('Error fetching Volume/OI', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
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
      return response.status === 200;
    } catch (error) {
      logger.error('FlashAlpha health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
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
