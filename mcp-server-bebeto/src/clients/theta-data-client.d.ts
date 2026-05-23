import { HistoricalOptionsData, VolatilityData, ThetaDecayData } from '../utils/types.js';
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
declare class ThetaDataClient {
    private email;
    private password;
    private requestCount;
    private lastRequestTime;
    private rateLimitDelay;
    private cache;
    private pythonAvailable;
    constructor();
    /**
     * Check if Python and thetadata package are available
     */
    private checkPythonAvailability;
    /**
     * Execute Python code and return result
     */
    private executePython;
    /**
     * Enforce rate limiting
     */
    private enforceRateLimit;
    /**
     * Get cached data if available and not expired
     */
    private getCached;
    /**
     * Set cached data with TTL
     */
    private setCached;
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
    getHistoricalOptions(symbol: string, strike: number, expiration: string, optionType: 'call' | 'put', startDate: string, endDate: string): Promise<HistoricalOptionsData[]>;
    /**
     * Get current volatility data for a symbol
     *
     * @param symbol Stock ticker symbol
     * @param term Optional term ('weekly', 'monthly', 'quarterly')
     */
    getVolatility(symbol: string, term?: string): Promise<VolatilityData | null>;
    /**
     * Get theta decay analysis for an options chain
     *
     * @param symbol Stock ticker symbol
     * @param expiration Expiration date (YYYY-MM-DD)
     */
    getThetaDecay(symbol: string, expiration: string): Promise<ThetaDecayData[]>;
    /**
     * Get options chain for a specific expiration
     *
     * @param symbol Stock ticker symbol
     * @param expiration Expiration date (YYYY-MM-DD)
     */
    getOptionsChain(symbol: string, expiration: string): Promise<{
        calls: HistoricalOptionsData[];
        puts: HistoricalOptionsData[];
    }>;
    /**
     * Get all available symbols in ThetaData
     *
     * @returns Array of stock symbols available for options trading
     */
    getSymbols(): Promise<string[]>;
    /**
     * Get all available expirations for a symbol
     *
     * @param symbol Stock ticker symbol
     * @returns Array of expiration dates in YYYY-MM-DD format
     */
    getExpirations(symbol: string): Promise<string[]>;
    /**
     * Get all available strike prices for a symbol/expiration
     *
     * @param symbol Stock ticker symbol
     * @param expiration Expiration date (YYYY-MM-DD)
     * @returns Array of strike prices
     */
    getStrikes(symbol: string, expiration: string): Promise<number[]>;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get API stats
     */
    getStats(): {
        totalRequests: number;
        cacheSize: number;
        rateLimitDelay: number;
        pythonAvailable: boolean;
    };
    /**
     * Clear cache
     */
    clearCache(): void;
}
export declare const thetaDataClient: ThetaDataClient;
export default ThetaDataClient;
//# sourceMappingURL=theta-data-client.d.ts.map