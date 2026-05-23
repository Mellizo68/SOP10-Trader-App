/**
 * FlashAlpha Data Types
 */
export interface GEXData {
    symbol: string;
    strike?: number;
    gex: number;
    gexPercent: number;
    gammaFlip?: boolean;
    regime: 'bullish' | 'bearish' | 'neutral';
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
    rho?: number;
    iv: number;
    price: number;
    timestamp: string;
}
export interface GammaFlipData {
    symbol: string;
    flipLevel: number;
    direction: 'up' | 'down' | 'neutral';
    strength: number;
    confidence: number;
    timestamp: string;
}
export interface OptionsWallsData {
    symbol: string;
    strikePrice: number;
    putWall: {
        contracts: number;
        level: 'strong' | 'moderate' | 'weak';
    };
    callWall: {
        contracts: number;
        level: 'strong' | 'moderate' | 'weak';
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
    totalVolume: number;
    timestamp: string;
}
/**
 * Theta Data Types
 */
export interface HistoricalOptionsData {
    symbol: string;
    strike: number;
    expiration: string;
    optionType: 'call' | 'put';
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number;
    impliedVolatility: number;
    date: string;
}
export interface VolatilityData {
    symbol: string;
    historicalVolatility: number;
    impliedVolatility: number;
    volatilityTerm: number;
    skew: number;
    term: string;
    timestamp: string;
}
export interface ThetaDecayData {
    symbol: string;
    strike: number;
    expiration: string;
    optionType: 'call' | 'put';
    theta: number;
    dailyDecay: number;
    weeklyDecay: number;
    decayAcceleration: number;
    daysToExpiration: number;
    timestamp: string;
}
/**
 * Combined Analysis Types
 */
export interface MarketAnalysis {
    symbol: string;
    timestamp: string;
    gex: GEXData | null;
    gammaFlip: GammaFlipData | null;
    supportLevels: number[];
    resistanceLevels: number[];
    bullishConfidence: number;
    bearishConfidence: number;
    recommendation: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}
export interface GreeksChainAnalysis {
    symbol: string;
    expiration: string;
    totalDelta: number;
    totalGamma: number;
    totalTheta: number;
    totalVega: number;
    callDominance: number;
    putDominance: number;
    impliedVolatility: number;
    timestamp: string;
}
export interface ThetaDecayAnalysis {
    symbol: string;
    expiration: string;
    totalTheta: number;
    dailyDecay: number;
    weeklyDecay: number;
    daysToExpiration: number;
    acceleratingDecay: boolean;
    timestamp: string;
}
/**
 * MCP Tool Response Types
 */
export interface ToolResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    cached?: boolean;
    timestamp: string;
}
export interface ToolError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map