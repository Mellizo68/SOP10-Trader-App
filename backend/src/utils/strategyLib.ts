/**
 * Options Strategy Library
 * Predefined strategies for backtesting
 */

export interface StrategyDefinition {
  name: string
  description: string
  type: 'spread' | 'single' | 'multi'
  legs: StrategyLeg[]
}

export interface StrategyLeg {
  optionType: 'call' | 'put'
  position: 'long' | 'short'
  strikeOffset: number // Offset from ATM (0 = ATM, 0.05 = 5% OTM)
}

export interface StrategyResult {
  maxProfit: number
  maxLoss: number
  breakEvenLower: number
  breakEvenUpper: number
  profitZones: [number, number][]
  lossZones: [number, number][]
}

/**
 * Iron Condor Strategy
 * Sell OTM Call Spread + Sell OTM Put Spread
 * High probability, defined risk
 */
export const ironCondor: StrategyDefinition = {
  name: 'Iron Condor',
  description: 'Sell OTM call spread + sell OTM put spread for defined risk income',
  type: 'multi',
  legs: [
    { optionType: 'call', position: 'short', strikeOffset: 0.1 }, // Sell 10% OTM call
    { optionType: 'call', position: 'long', strikeOffset: 0.15 }, // Buy 15% OTM call
    { optionType: 'put', position: 'short', strikeOffset: -0.1 }, // Sell 10% OTM put
    { optionType: 'put', position: 'long', strikeOffset: -0.15 }, // Buy 15% OTM put
  ],
}

/**
 * Long Straddle Strategy
 * Buy ATM Call + Buy ATM Put
 * Bet on volatility, unlimited upside, defined downside
 */
export const longStraddle: StrategyDefinition = {
  name: 'Long Straddle',
  description: 'Buy ATM call and put for volatility expansion plays',
  type: 'multi',
  legs: [
    { optionType: 'call', position: 'long', strikeOffset: 0 },
    { optionType: 'put', position: 'long', strikeOffset: 0 },
  ],
}

/**
 * Short Straddle Strategy
 * Sell ATM Call + Sell ATM Put
 * Bet on low volatility, defined profit, unlimited risk
 */
export const shortStraddle: StrategyDefinition = {
  name: 'Short Straddle',
  description: 'Sell ATM call and put for low volatility plays',
  type: 'multi',
  legs: [
    { optionType: 'call', position: 'short', strikeOffset: 0 },
    { optionType: 'put', position: 'short', strikeOffset: 0 },
  ],
}

/**
 * Bull Call Spread Strategy
 * Buy ATM Call + Sell OTM Call
 * Limited upside, limited risk, defined profit
 */
export const bullCallSpread: StrategyDefinition = {
  name: 'Bull Call Spread',
  description: 'Buy ATM call, sell OTM call for bullish trades',
  type: 'multi',
  legs: [
    { optionType: 'call', position: 'long', strikeOffset: 0 },
    { optionType: 'call', position: 'short', strikeOffset: 0.05 },
  ],
}

/**
 * Bear Call Spread Strategy
 * Sell ATM Call + Buy OTM Call
 * Limited profit, limited risk, bearish trades
 */
export const bearCallSpread: StrategyDefinition = {
  name: 'Bear Call Spread',
  description: 'Sell ATM call, buy OTM call for bearish trades',
  type: 'multi',
  legs: [
    { optionType: 'call', position: 'short', strikeOffset: 0 },
    { optionType: 'call', position: 'long', strikeOffset: 0.05 },
  ],
}

/**
 * Bull Put Spread Strategy
 * Sell OTM Put + Buy Further OTM Put
 * Limited profit, limited risk, neutral-to-bullish
 */
export const bullPutSpread: StrategyDefinition = {
  name: 'Bull Put Spread',
  description: 'Sell OTM put, buy further OTM put for neutral-to-bullish trades',
  type: 'multi',
  legs: [
    { optionType: 'put', position: 'short', strikeOffset: -0.05 },
    { optionType: 'put', position: 'long', strikeOffset: -0.1 },
  ],
}

/**
 * Get strategy by name
 */
export function getStrategy(name: string): StrategyDefinition | null {
  const strategies: Record<string, StrategyDefinition> = {
    'iron_condor': ironCondor,
    'long_straddle': longStraddle,
    'short_straddle': shortStraddle,
    'bull_call_spread': bullCallSpread,
    'bear_call_spread': bearCallSpread,
    'bull_put_spread': bullPutSpread,
  }

  return strategies[name.toLowerCase()] || null
}

/**
 * Get all available strategies
 */
export function getAllStrategies(): StrategyDefinition[] {
  return [
    ironCondor,
    longStraddle,
    shortStraddle,
    bullCallSpread,
    bearCallSpread,
    bullPutSpread,
  ]
}

/**
 * Calculate profit/loss at a given price for a strategy
 * @param strategy - Strategy definition
 * @param atmPrice - Current price (at-the-money price)
 * @param premiums - Cost/credit for each leg {long: number, short: number}
 * @param pricePoint - Price at expiration to calculate P&L
 */
export function calculatePnL(
  strategy: StrategyDefinition,
  atmPrice: number,
  premiums: { [key: number]: number }, // strike price -> premium
  pricePoint: number
): number {
  let pnl = 0

  for (const leg of strategy.legs) {
    const strike = atmPrice * (1 + leg.strikeOffset)
    const premium = premiums[strike] || 0
    const intrinsicValue =
      leg.optionType === 'call'
        ? Math.max(0, pricePoint - strike)
        : Math.max(0, strike - pricePoint)

    if (leg.position === 'long') {
      // Long: profit when intrinsic value > premium paid
      pnl += intrinsicValue - premium
    } else {
      // Short: profit when intrinsic value < premium collected
      pnl += premium - intrinsicValue
    }
  }

  return pnl
}

/**
 * Calculate risk/reward profile for a strategy
 * @param strategy - Strategy definition
 * @param atmPrice - Current ATM price
 * @param premiums - Cost/credit for each leg
 */
export function calculateRiskReward(
  strategy: StrategyDefinition,
  atmPrice: number,
  premiums: { [key: number]: number }
): StrategyResult {
  const prices = Array.from({ length: 201 }, (_, i) => atmPrice * 0.5 + (atmPrice * i * 0.005)) // 50% to 150% of ATM
  const pnls = prices.map(price => calculatePnL(strategy, atmPrice, premiums, price))

  const maxProfit = Math.max(...pnls)
  const maxLoss = Math.min(...pnls)

  // Find break-even points
  const breakEvens = prices.filter((_, i) => pnls[i] === 0)
  const breakEvenLower = Math.min(...breakEvens)
  const breakEvenUpper = Math.max(...breakEvens)

  // Find profit zones
  const profitZones: [number, number][] = []
  let inProfit = false
  let zoneStart = 0

  for (let i = 0; i < prices.length; i++) {
    if (pnls[i] > 0 && !inProfit) {
      zoneStart = prices[i]
      inProfit = true
    } else if (pnls[i] <= 0 && inProfit) {
      profitZones.push([zoneStart, prices[i - 1]])
      inProfit = false
    }
  }

  // Find loss zones
  const lossZones: [number, number][] = []
  inProfit = true
  zoneStart = 0

  for (let i = 0; i < prices.length; i++) {
    if (pnls[i] < 0 && inProfit) {
      zoneStart = prices[i]
      inProfit = false
    } else if (pnls[i] >= 0 && !inProfit) {
      lossZones.push([zoneStart, prices[i - 1]])
      inProfit = true
    }
  }

  return {
    maxProfit,
    maxLoss,
    breakEvenLower,
    breakEvenUpper,
    profitZones,
    lossZones,
  }
}
