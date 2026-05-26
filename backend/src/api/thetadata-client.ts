import { spawn } from 'child_process';
import logger from '../utils/logger';

/**
 * ThetaData Client
 *
 * Handles all interactions with Theta Data via Python SDK
 * Uses subprocess execution for direct SDK access (email/password auth)
 *
 * Requirements:
 * - Python 3.7+
 * - pip install thetadata
 * - THETA_DATA_EMAIL and THETA_DATA_PASSWORD env vars
 */

export interface HistoricalOption {
  symbol: string;
  strike: number;
  expiration: string;
  optionType: 'call' | 'put';
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  theta: number;
  delta: number;
  gamma: number;
  vega: number;
}

export interface VolatilityData {
  symbol: string;
  date: string;
  historicalVolatility: number;
  impliedVolatility: number;
  volatilitySkew: number;
}

class ThetaDataClient {
  private email: string;
  private password: string;
  private requestCount = 0;
  private lastRequestTime = 0;
  private rateLimitDelay = 200; // ms between requests
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private pythonAvailable: boolean = false;
  private cacheMap = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = {
    historical: 86400000, // 24 hours
    volatility: 3600000,  // 1 hour
    chain: 1800000,       // 30 minutes
  };

  constructor() {
    this.email = process.env.THETA_DATA_EMAIL || '';
    this.password = process.env.THETA_DATA_PASSWORD || '';

    if (!this.email || !this.password) {
      logger.warn('ThetaData credentials not configured', {
        email: !!this.email,
        password: !!this.password,
      });
    }

    // Check if Python SDK is available
    // this.checkPythonAvailability();
  }

  /**
   * Check if Python and thetadata package are available
   */
  private checkPythonAvailability(): void {
    try {
      const pythonCheck = spawn('python3', ['-c', 'import thetadata; print("OK")'], {
        timeout: 5000,
      });

      let output = '';
      pythonCheck.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonCheck.on('close', (code) => {
        if (code === 0 && output.includes('OK')) {
          this.pythonAvailable = true;
          logger.info('✅ Python thetadata package available', {
            service: 'ThetaData',
          });
        } else {
          logger.warn('Python thetadata package not available', {
            service: 'ThetaData',
            code,
          });
        }
      });
    } catch (error) {
      logger.warn('Failed to check Python availability', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute Python code and return result
   */
  private async executePython(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', code], {
        timeout: this.REQUEST_TIMEOUT,
      });

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(error || `Python exited with code ${code}`));
        }
      });

      python.on('error', (err) => {
        reject(err);
      });

      // Handle timeout
      setTimeout(() => {
        try {
          python.kill();
        } catch (e) {
          // Already terminated
        }
        reject(new Error('Python execution timeout'));
      }, this.REQUEST_TIMEOUT);
    });
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
   * Get cached data if available and not expired
   */
  private getFromCache(key: string): any | null {
    const cached = this.cacheMap.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL.historical) {
      return cached.data;
    }
    this.cacheMap.delete(key);
    return null;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL.historical): void {
    this.cacheMap.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get historical options data using option_history_ohlc
   * Requires expiration date since ThetaData API requires it
   */
  async getHistoricalOptions(
    symbol: string,
    startDate: string,
    endDate: string,
    strike?: number,
    expiration?: string,
    optionType?: 'call' | 'put'
  ): Promise<HistoricalOption[]> {
    try {
      await this.enforceRateLimit();

      if (!expiration) {
        throw new Error('Expiration date is required for historical options. Use /api/market/chain/:symbol/:expiration to see available expirations');
      }

      const cacheKey = `hist:${symbol}:${startDate}:${endDate}:${strike || 'all'}:${expiration}:${optionType || 'all'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Historical options from cache', { symbol });
        return cached;
      }

      if (!this.pythonAvailable) {
        throw new Error('Python thetadata package not available');
      }

      let pythonCode = `
import json
from thetadata import ThetaClient
from datetime import datetime, date

try:
    client = ThetaClient(email="${this.email}", password="${this.password}")

    # Parse expiration date
    exp_date = datetime.strptime("${expiration}", "%Y-%m-%d").date() if "${expiration}" else None

    # Use option_history_ohlc to get historical options data
    # Note: interval must be at least 1 minute for bulk history requests
    df = client.option_history_ohlc(
        symbol="${symbol}",
        expiration=exp_date,
        interval="1m",
        start_date=datetime.strptime("${startDate}", "%Y-%m-%d").date(),
        end_date=datetime.strptime("${endDate}", "%Y-%m-%d").date()`;

      if (strike !== undefined) pythonCode += `,\\n        strike="${strike}"`;
      if (optionType) pythonCode += `,\\n        right="${optionType.toUpperCase().charAt(0)}"`;

      pythonCode += `
    )

    # Convert Polars DataFrame to JSON
    # Use to_dicts() to convert to list of dicts, then JSON encode
    data = df.to_dicts() if hasattr(df, 'to_dicts') else df.to_dict(orient='records')

    # Convert datetime objects to strings and handle NaN values for JSON serialization
    import datetime as dt
    import math
    for item in data:
        for key, value in item.items():
            if isinstance(value, (dt.date, dt.datetime)):
                item[key] = value.isoformat()
            elif isinstance(value, float) and math.isnan(value):
                item[key] = None
            elif isinstance(value, float) and math.isinf(value):
                item[key] = None

    print(json.dumps(data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const result = await this.executePython(pythonCode);
      const data = JSON.parse(result);

      if (data.error) {
        throw new Error(`ThetaData error: ${data.error}`);
      }

      // Transform and cache
      const options: HistoricalOption[] = data.map((item: any) => ({
        symbol,
        strike: parseFloat(item.strike) || 0,
        expiration: expiration || '',
        optionType: (item.right || 'C') === 'C' ? 'call' : 'put',
        date: item.date || new Date().toISOString().split('T')[0],
        open: parseFloat(item.open) || 0,
        high: parseFloat(item.high) || 0,
        low: parseFloat(item.low) || 0,
        close: parseFloat(item.close) || 0,
        volume: parseInt(item.volume) || 0,
        openInterest: parseInt(item.open_interest) || 0,
        impliedVolatility: 0,
        theta: 0,
        delta: 0,
        gamma: 0,
        vega: 0,
      }));

      this.setCache(cacheKey, options, this.CACHE_TTL.historical);

      logger.debug('Historical options fetched', {
        symbol,
        expiration,
        count: options.length,
      });

      return options;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching historical options', {
        symbol,
        error: errorMsg,
      });
      return [];
    }
  }

  /**
   * Get volatility analysis using option_history_greeks_implied_volatility
   */
  async getVolatility(symbol: string, startDate?: string, endDate?: string): Promise<VolatilityData[]> {
    try {
      await this.enforceRateLimit();

      const cacheKey = `vol:${symbol}:${startDate || 'all'}:${endDate || 'all'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Volatility data from cache', { symbol });
        return cached;
      }

      if (!this.pythonAvailable) {
        throw new Error('Python thetadata package not available');
      }

      // Get a sample expiration date to query implied volatility
      let pythonCode = `
import json
from thetadata import ThetaClient
from datetime import datetime
import datetime as dt

try:
    client = ThetaClient(email="${this.email}", password="${this.password}")

    # Get list of expirations available (returns Polars DataFrame)
    expirations_df = client.option_list_expirations(symbol="${symbol}")
    if len(expirations_df) == 0:
        print(json.dumps({"error": "No expirations found"}))
    else:
        # Extract first expiration from DataFrame
        # Convert to dicts, take first row, get expiration value
        exp_dicts = expirations_df.to_dicts() if hasattr(expirations_df, 'to_dicts') else expirations_df.to_dict(orient='records')
        exp_str = exp_dicts[0]['expiration']  # Get first row's expiration value (as string)
        # Convert string date to datetime.date
        exp = datetime.strptime(exp_str, "%Y-%m-%d").date()

        # Get IV data for ATM strike
        df = client.option_history_greeks_implied_volatility(
            symbol="${symbol}",
            expiration=exp`;

      if (startDate) pythonCode += `,\n            start_date="${startDate}"`;
      if (endDate) pythonCode += `,\n            end_date="${endDate}"`;

      pythonCode += `
        )

        # Convert Polars DataFrame to JSON with datetime and NaN handling
        data = df.to_dicts() if hasattr(df, 'to_dicts') else df.to_dict(orient='records')

        # Convert datetime objects to strings and handle NaN values for JSON serialization
        import math
        for item in data:
            for key, value in item.items():
                if isinstance(value, (dt.date, dt.datetime)):
                    item[key] = value.isoformat()
                elif isinstance(value, float) and math.isnan(value):
                    item[key] = None
                elif isinstance(value, float) and math.isinf(value):
                    item[key] = None

        print(json.dumps(data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const result = await this.executePython(pythonCode);
      const data = JSON.parse(result);

      if (data.error) {
        throw new Error(`ThetaData error: ${data.error}`);
      }

      // Transform and cache - group by date
      const volatilityMap = new Map<string, VolatilityData>();
      data.forEach((item: any) => {
        const date = item.date || new Date().toISOString().split('T')[0];
        if (!volatilityMap.has(date)) {
          volatilityMap.set(date, {
            symbol,
            date,
            historicalVolatility: 0,
            impliedVolatility: item.iv || 0,
            volatilitySkew: 0,
          });
        }
      });

      const volatilityData = Array.from(volatilityMap.values());

      this.setCache(cacheKey, volatilityData, this.CACHE_TTL.volatility);

      logger.debug('Volatility data fetched', {
        symbol,
        count: volatilityData.length,
      });

      return volatilityData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching volatility', {
        symbol,
        error: errorMsg,
      });
      return [];
    }
  }

  /**
   * Get options chain for specific expiration using option_list_contracts
   */
  async getOptionsChain(
    symbol: string,
    expiration: string
  ): Promise<HistoricalOption[]> {
    try {
      await this.enforceRateLimit();

      const cacheKey = `chain:${symbol}:${expiration}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Options chain from cache', { symbol, expiration });
        return cached;
      }

      if (!this.pythonAvailable) {
        throw new Error('Python thetadata package not available');
      }

      const pythonCode = `
import json
from thetadata import ThetaClient
from datetime import datetime

try:
    client = ThetaClient(email="${this.email}", password="${this.password}")

    # Parse expiration date
    exp_date = datetime.strptime("${expiration}", "%Y-%m-%d").date()

    # Get all contracts for the expiration
    contracts = client.option_list_contracts(
        request_type="ALL",
        date=exp_date,
        symbol="${symbol}"
    )

    # Transform contracts to expected format
    chain_data = []
    for contract in contracts:
        # contract is a tuple/dict like (strike, right) where right is 'C' or 'P'
        if isinstance(contract, (tuple, list)):
            strike, right = contract
        else:
            # Try as dict
            strike = contract.get('strike') or contract.get('Strike')
            right = contract.get('right') or contract.get('Right') or 'C'

        chain_data.append({
            'strike': float(strike),
            'right': right,
            'exp': "${expiration}"
        })

    print(json.dumps(chain_data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const result = await this.executePython(pythonCode);
      const data = JSON.parse(result);

      if (data.error) {
        throw new Error(`ThetaData error: ${data.error}`);
      }

      const chain: HistoricalOption[] = data.map((item: any) => ({
        symbol,
        strike: item.strike || 0,
        expiration: expiration,
        optionType: (item.right || 'C').toUpperCase() === 'C' ? 'call' : 'put',
        date: new Date().toISOString().split('T')[0],
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
        openInterest: 0,
        impliedVolatility: 0,
        theta: 0,
        delta: 0,
        gamma: 0,
        vega: 0,
      }));

      this.setCache(cacheKey, chain, this.CACHE_TTL.chain);

      logger.debug('Options chain fetched', {
        symbol,
        expiration,
        count: chain.length,
      });

      return chain;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching options chain', {
        symbol,
        expiration,
        error: errorMsg,
      });
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.enforceRateLimit();

      if (!this.pythonAvailable) {
        logger.warn('Python not available for health check');
        return false;
      }

      const pythonCode = `
import json
from thetadata import ThetaClient

try:
    client = ThetaClient(email="${this.email}", password="${this.password}")

    # Simple test query
    df = client.get_historical(symbol="SPY", start_date="2026-05-24", end_date="2026-05-25")
    print(json.dumps({"status": "OK"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const result = await this.executePython(pythonCode);
      const data = JSON.parse(result);

      if (data.status === 'OK') {
        logger.debug('ThetaData health check passed');
        return true;
      }

      logger.warn('ThetaData health check failed', { error: data.error });
      return false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('ThetaData health check error', { error: errorMsg });
      return false;
    }
  }

  /**
   * Get API statistics
   */
  getStats(): {
    totalRequests: number;
    pythonAvailable: boolean;
    cacheSize: number;
  } {
    return {
      totalRequests: this.requestCount,
      pythonAvailable: this.pythonAvailable,
      cacheSize: this.cacheMap.size,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cacheMap.clear();
    logger.info('ThetaData cache cleared');
  }
}

// Export singleton instance
export const thetaDataClient = new ThetaDataClient();

export default ThetaDataClient;
