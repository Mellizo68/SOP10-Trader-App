import { HistoricalOptionsData, VolatilityData, ThetaDecayData } from '../utils/types.js'
import { spawn } from 'child_process'

/**
 * Theta Data Client for MCP Server
 *
 * Uses official Theta Data Python SDK for authentication and data access.
 * Authentication: Uses Theta Data website credentials (email/password)
 * No Theta Terminal required - direct connection to servers
 *
 * Theta Data Python SDK: https://docs.thetadata.us/Python-Library/Getting-Started.html
 * Subscription Portal: https://www.thetadata.net/portal/subscriptions
 */
class ThetaDataClient {
  private email: string
  private password: string
  private requestCount = 0
  private lastRequestTime = 0
  private rateLimitDelay = 200 // ms between requests (respect rate limits)
  private cache: Map<string, { data: unknown; expiry: number }> = new Map()
  private pythonAvailable: boolean = false

  constructor() {
    this.email = process.env.THETA_DATA_EMAIL || ''
    this.password = process.env.THETA_DATA_PASSWORD || ''

    if (!this.email || !this.password) {
      console.warn(
        '⚠️ Theta Data credentials not configured. Set THETA_DATA_EMAIL and THETA_DATA_PASSWORD environment variables.'
      )
    }

    // Check if Python and thetadata package are available
    this.checkPythonAvailability()
  }

  /**
   * Check if Python and thetadata package are available
   */
  private async checkPythonAvailability(): Promise<void> {
    try {
      const result = await this.executePython('import thetadata; print("OK")')
      this.pythonAvailable = result.includes('OK')
    } catch {
      console.warn('⚠️ Python thetadata package not available. Install with: pip install thetadata')
      this.pythonAvailable = false
    }
  }

  /**
   * Execute Python code and return result
   */
  private async executePython(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', code])
      let output = ''
      let error = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        error += data.toString()
      })

      python.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim())
        } else {
          reject(new Error(error || `Python exited with code ${code}`))
        }
      })

      python.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }


  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    if (item.expiry < Date.now()) {
      this.cache.delete(key)
      return null
    }
    return item.data as T
  }

  /**
   * Set cached data with TTL
   */
  private setCached<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    })
  }

  /**
   * Get historical options data for a specific contract
   *
   * @param symbol Stock ticker symbol
   * @param strike Strike price
   * @param expiration Expiration date (YYYY-MM-DD)
   * @param optionType 'call' or 'put'
   * @param startDate Start date for historical data (YYYY-MM-DD)
   * @param endDate End date for historical data (YYYY-MM-DD)
   */
  async getHistoricalOptions(
    symbol: string,
    strike: number,
    expiration: string,
    optionType: 'call' | 'put',
    startDate: string,
    endDate: string
  ): Promise<HistoricalOptionsData[]> {
    try {
      const cacheKey = `hist:${symbol}:${strike}:${expiration}:${optionType}:${startDate}-${endDate}`
      const cached = this.getCached<HistoricalOptionsData[]>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      if (!this.pythonAvailable) {
        console.warn('⚠️ Python thetadata package not available')
        return []
      }

      // Use Python SDK to fetch historical options
      const pythonCode = `
from thetadata import ThetaClient
import json
client = ThetaClient(email="${this.email}", password="${this.password}")
try:
  df = client.get_historical(
    symbol="${symbol.toUpperCase()}",
    start_date="${startDate}",
    end_date="${endDate}",
    strike=${strike},
    exp="${expiration}",
    option_type="${optionType[0].toUpperCase()}"
  )
  data = []
  for idx, row in df.iterrows():
    data.append({
      "symbol": "${symbol.toUpperCase()}",
      "strike": ${strike},
      "expiration": "${expiration}",
      "optionType": "${optionType}",
      "open": float(row.get("open", 0)),
      "high": float(row.get("high", 0)),
      "low": float(row.get("low", 0)),
      "close": float(row.get("close", 0)),
      "volume": float(row.get("volume", 0)),
      "openInterest": float(row.get("oi", 0)),
      "impliedVolatility": float(row.get("iv", 0)),
      "date": str(row.name)
    })
  print(json.dumps(data))
except Exception as e:
  print(json.dumps({"error": str(e)}))
`

      const result = await this.executePython(pythonCode)
      const data = JSON.parse(result)

      if (Array.isArray(data)) {
        this.setCached(cacheKey, data, 86400)
        return data
      }

      return []
    } catch (error) {
      console.error(
        '❌ Error fetching historical options:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Get current volatility data for a symbol
   *
   * @param symbol Stock ticker symbol
   * @param term Optional term ('weekly', 'monthly', 'quarterly')
   */
  async getVolatility(symbol: string, term: string = 'monthly'): Promise<VolatilityData | null> {
    try {
      const cacheKey = `vol:${symbol}:${term}`
      const cached = this.getCached<VolatilityData>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      if (!this.pythonAvailable) {
        console.warn('⚠️ Python thetadata package not available')
        return null
      }

      const pythonCode = `
from thetadata import ThetaClient
import json
client = ThetaClient(email="${this.email}", password="${this.password}")
try:
  result = client.get_volatility(
    symbol="${symbol.toUpperCase()}",
    term="${term}"
  )
  data = {
    "symbol": "${symbol.toUpperCase()}",
    "historicalVolatility": float(result.historical_volatility) if hasattr(result, 'historical_volatility') else 0,
    "impliedVolatility": float(result.implied_volatility) if hasattr(result, 'implied_volatility') else 0,
    "volatilityTerm": float(result.volatility_term) if hasattr(result, 'volatility_term') else 0,
    "skew": float(result.skew) if hasattr(result, 'skew') else 0,
    "term": "${term}"
  }
  print(json.dumps(data))
except Exception as e:
  print(json.dumps({"error": str(e)}))
`

      const result = await this.executePython(pythonCode)
      const data = JSON.parse(result)

      if (!data.error) {
        const volData: VolatilityData = {
          symbol: data.symbol,
          historicalVolatility: data.historicalVolatility,
          impliedVolatility: data.impliedVolatility,
          volatilityTerm: data.volatilityTerm,
          skew: data.skew,
          term: data.term,
          timestamp: new Date().toISOString(),
        }

        // Cache for 1 hour (volatility changes but not as frequently)
        this.setCached(cacheKey, volData, 3600)
        return volData
      }

      return null
    } catch (error) {
      console.error(
        '❌ Error fetching volatility:',
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

  /**
   * Get theta decay analysis for an options chain
   *
   * @param symbol Stock ticker symbol
   * @param expiration Expiration date (YYYY-MM-DD)
   */
  async getThetaDecay(symbol: string, expiration: string): Promise<ThetaDecayData[]> {
    try {
      const cacheKey = `theta:${symbol}:${expiration}`
      const cached = this.getCached<ThetaDecayData[]>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      if (!this.pythonAvailable) {
        console.warn('⚠️ Python thetadata package not available')
        return []
      }

      const pythonCode = `
from thetadata import ThetaClient
import json
from datetime import datetime
client = ThetaClient(email="${this.email}", password="${this.password}")
try:
  df = client.get_greek(
    symbol="${symbol.toUpperCase()}",
    exp="${expiration}",
    greek="theta"
  )

  exp_date = datetime.strptime("${expiration}", "%Y-%m-%d")
  now = datetime.now()
  days_to_exp = (exp_date - now).days

  data = []
  for idx, row in df.iterrows():
    theta_val = float(row.get("theta", 0)) if "theta" in row else 0
    daily_decay = theta_val / days_to_exp if days_to_exp > 0 else 0
    weekly_decay = daily_decay * 7

    data.append({
      "symbol": "${symbol.toUpperCase()}",
      "strike": float(row.get("strike", 0)),
      "expiration": "${expiration}",
      "optionType": row.get("type", "").lower(),
      "theta": theta_val,
      "dailyDecay": daily_decay,
      "weeklyDecay": weekly_decay,
      "decayAcceleration": float(row.get("gamma", 0)) if "gamma" in row else 0,
      "daysToExpiration": days_to_exp
    })
  print(json.dumps(data))
except Exception as e:
  print(json.dumps({"error": str(e)}))
`

      const result = await this.executePython(pythonCode)
      const data = JSON.parse(result)

      if (Array.isArray(data)) {
        const thetaData = data.map((item: any) => ({
          symbol: item.symbol,
          strike: item.strike,
          expiration: item.expiration,
          optionType: item.optionType,
          theta: item.theta,
          dailyDecay: item.dailyDecay,
          weeklyDecay: item.weeklyDecay,
          decayAcceleration: item.decayAcceleration,
          daysToExpiration: item.daysToExpiration,
          timestamp: new Date().toISOString(),
        } as ThetaDecayData))

        // Cache for 30 minutes
        this.setCached(cacheKey, thetaData, 1800)
        return thetaData
      }

      return []
    } catch (error) {
      console.error(
        '❌ Error fetching theta decay:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Get options chain for a specific expiration
   *
   * @param symbol Stock ticker symbol
   * @param expiration Expiration date (YYYY-MM-DD)
   */
  async getOptionsChain(
    symbol: string,
    expiration: string
  ): Promise<{ calls: HistoricalOptionsData[]; puts: HistoricalOptionsData[] }> {
    try {
      const cacheKey = `chain:${symbol}:${expiration}`
      const cached = this.getCached<{
        calls: HistoricalOptionsData[]
        puts: HistoricalOptionsData[]
      }>(cacheKey)
      if (cached) return cached

      await this.enforceRateLimit()

      if (!this.pythonAvailable) {
        console.warn('⚠️ Python thetadata package not available')
        return { calls: [], puts: [] }
      }

      const pythonCode = `
from thetadata import ThetaClient
import json
client = ThetaClient(email="${this.email}", password="${this.password}")
try:
  df = client.get_historical(
    symbol="${symbol.toUpperCase()}",
    exp="${expiration}",
    start_date="${expiration}",
    end_date="${expiration}"
  )

  calls = []
  puts = []

  for idx, row in df.iterrows():
    item = {
      "symbol": "${symbol.toUpperCase()}",
      "strike": float(row.get("strike", 0)),
      "expiration": "${expiration}",
      "open": float(row.get("open", 0)),
      "high": float(row.get("high", 0)),
      "low": float(row.get("low", 0)),
      "close": float(row.get("close", 0)),
      "volume": float(row.get("volume", 0)),
      "openInterest": float(row.get("oi", 0)),
      "impliedVolatility": float(row.get("iv", 0)),
      "date": str(row.name) if hasattr(row, 'name') else "${expiration}"
    }

    option_type = row.get("type", "").upper()
    if option_type == "C" or option_type == "CALL":
      calls.append({**item, "optionType": "call"})
    else:
      puts.append({**item, "optionType": "put"})

  print(json.dumps({"calls": calls, "puts": puts}))
except Exception as e:
  print(json.dumps({"error": str(e)}))
`

      const result = await this.executePython(pythonCode)
      const data = JSON.parse(result)

      if (!data.error && data.calls && data.puts) {
        const chainData = {
          calls: data.calls.map((item: any) => ({
            symbol: item.symbol,
            strike: item.strike,
            expiration: item.expiration,
            optionType: 'call' as const,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            openInterest: item.openInterest,
            impliedVolatility: item.impliedVolatility,
            date: item.date,
          } as HistoricalOptionsData)),
          puts: data.puts.map((item: any) => ({
            symbol: item.symbol,
            strike: item.strike,
            expiration: item.expiration,
            optionType: 'put' as const,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            openInterest: item.openInterest,
            impliedVolatility: item.impliedVolatility,
            date: item.date,
          } as HistoricalOptionsData)),
        }

        // Cache for 1 hour
        this.setCached(cacheKey, chainData, 3600)
        return chainData
      }

      return { calls: [], puts: [] }
    } catch (error) {
      console.error(
        '❌ Error fetching options chain:',
        error instanceof Error ? error.message : error
      )
      return { calls: [], puts: [] }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.enforceRateLimit()

      if (!this.pythonAvailable) {
        console.warn('⚠️ Python thetadata package not available')
        return false
      }

      const pythonCode = `
from thetadata import ThetaClient
import json
client = ThetaClient(email="${this.email}", password="${this.password}")
try:
  # Try a simple API call to verify connectivity
  result = client.get_hist_option_sample(
    symbol="SPY",
    option_type="C",
    exp="2026-06-20"
  )
  print(json.dumps({"status": "ok", "connected": True}))
except Exception as e:
  print(json.dumps({"status": "error", "connected": False, "error": str(e)}))
`

      const result = await this.executePython(pythonCode)
      const data = JSON.parse(result)
      return data.status === 'ok' && data.connected === true
    } catch (error) {
      console.error(
        '❌ Theta Data health check failed:',
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Get API stats
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      cacheSize: this.cache.size,
      rateLimitDelay: this.rateLimitDelay,
      pythonAvailable: this.pythonAvailable,
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

export const thetaDataClient = new ThetaDataClient()
export default ThetaDataClient
