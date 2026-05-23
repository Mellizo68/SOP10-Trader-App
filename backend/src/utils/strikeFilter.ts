import { GreeksData, OptionsWallsData, VolumeOIData } from '../api/flashalpha-client';

/**
 * Strike Range Filtering Utility
 *
 * Reduces API response payload by 70-90% by filtering to relevant strikes
 * instead of returning all strikes across all expirations.
 *
 * Default behavior: ATM (At-The-Money) ± 20% range
 * Example: SPY at $500 returns $400-$600 strikes only
 */

interface StrikeFilterRange {
  strikeMin: number;
  strikeMax: number;
}

/**
 * Calculate ATM ± percentage range
 * Default: ±20% around current price
 */
export function calculateATMRange(
  currentPrice: number,
  percentageRange: number = 20
): StrikeFilterRange {
  const delta = currentPrice * (percentageRange / 100);

  return {
    strikeMin: Math.max(0, currentPrice - delta), // Don't go below 0
    strikeMax: currentPrice + delta,
  };
}

/**
 * Parse strike filter parameters from query string
 * Returns explicit range if provided, otherwise uses ATM range
 */
export function parseStrikeFilter(
  query: {
    strikeMin?: string | number;
    strikeMax?: string | number;
    strikeRange?: string | number; // ± percentage for ATM
  },
  currentPrice?: number
): StrikeFilterRange | null {
  // Explicit strike range provided
  if (query.strikeMin !== undefined && query.strikeMax !== undefined) {
    const min = parseFloat(String(query.strikeMin));
    const max = parseFloat(String(query.strikeMax));

    if (!isNaN(min) && !isNaN(max) && min <= max) {
      return { strikeMin: min, strikeMax: max };
    }
  }

  // ATM range with custom percentage
  if (query.strikeRange !== undefined && currentPrice) {
    const range = parseFloat(String(query.strikeRange));
    if (!isNaN(range) && range > 0) {
      return calculateATMRange(currentPrice, range);
    }
  }

  // Use default ATM ± 20% if current price available
  if (currentPrice) {
    return calculateATMRange(currentPrice, 20);
  }

  // No filtering if current price not available
  return null;
}

/**
 * Filter Greeks data by strike range
 * Reduces 100+ rows to 10-20 rows (80-90% reduction)
 */
export function filterGreeks(
  data: GreeksData[],
  strikeRange: StrikeFilterRange | null
): GreeksData[] {
  if (!strikeRange) {
    return data;
  }

  return data.filter(greek => {
    return greek.strike >= strikeRange.strikeMin && greek.strike <= strikeRange.strikeMax;
  });
}

/**
 * Filter Options Walls by strike range
 */
export function filterWalls(
  data: OptionsWallsData[],
  strikeRange: StrikeFilterRange | null
): OptionsWallsData[] {
  if (!strikeRange) {
    return data;
  }

  return data.filter(wall => {
    return (
      wall.strikePrice >= strikeRange.strikeMin &&
      wall.strikePrice <= strikeRange.strikeMax
    );
  });
}

/**
 * Filter Volume & OI by strike range
 */
export function filterVolumeOI(
  data: VolumeOIData[],
  strikeRange: StrikeFilterRange | null
): VolumeOIData[] {
  if (!strikeRange) {
    return data;
  }

  return data.filter(vol => {
    return (
      vol.strikePrice >= strikeRange.strikeMin &&
      vol.strikePrice <= strikeRange.strikeMax
    );
  });
}

/**
 * Get payload size estimate before/after filtering
 * Useful for monitoring compression impact
 */
export function estimatePayloadSizeReduction(
  originalSize: number,
  filteredSize: number
): { bytes: number; percent: number } {
  const reduction = originalSize - filteredSize;
  const percent = originalSize > 0 ? (reduction / originalSize) * 100 : 0;

  return {
    bytes: reduction,
    percent: Math.round(percent * 100) / 100,
  };
}

export default {
  calculateATMRange,
  parseStrikeFilter,
  filterGreeks,
  filterWalls,
  filterVolumeOI,
  estimatePayloadSizeReduction,
};
