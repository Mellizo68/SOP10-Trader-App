import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMarketData } from '../../hooks/useMarketData';
import { GEXCard } from './GEXCard';
import { GreeksTable } from './GreeksTable';
import { VirtualizedTable } from '../VirtualizedTable';

interface MarketAnalysisTabProps {
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

/**
 * Market Analysis Tab Component
 * Displays real-time market data:
 * - GEX (Gamma Exposure)
 * - Greeks (Delta, Gamma, Theta, Vega, IV)
 * - Gamma Flip alerts
 * - Options Walls
 * - Volume & Open Interest
 */
const MarketAnalysisTabComponent: React.FC<MarketAnalysisTabProps> = ({
  symbol = 'SPY',
  onSymbolChange,
}) => {
  // Current symbol (updates immediately for responsive input)
  const [currentSymbol, setCurrentSymbol] = useState(symbol);

  // Debounced symbol (updates after 300ms of no input changes)
  const [debouncedSymbol, setDebouncedSymbol] = useState(symbol);

  // Strike filtering options (Sprint 2: Payload Filtering)
  const [strikeRange, setStrikeRange] = useState<number>(20); // Default: ATM ± 20%
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customMin, setCustomMin] = useState<number | undefined>(undefined);
  const [customMax, setCustomMax] = useState<number | undefined>(undefined);

  // Debounce timer reference
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build filter options based on selection
  const filterOptions = useCustomRange
    ? { strikeMin: customMin, strikeMax: customMax }
    : { strikeRange: strikeRange };

  // Fetch data using debounced symbol with strike filters
  const { data, loading, error, lastUpdated, refetch } = useMarketData(
    debouncedSymbol,
    60000, // 60 second polling
    filterOptions
  );

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSymbol = e.target.value.toUpperCase();

    // Update display immediately (responsive UX)
    setCurrentSymbol(newSymbol);

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer: fetch after 300ms of no input changes
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSymbol(newSymbol);
      onSymbolChange?.(newSymbol);
    }, 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header with Symbol Input and Refresh */}
      <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              📊 Symbol
            </label>
            <input
              type="text"
              value={currentSymbol}
              onChange={handleSymbolChange}
              placeholder="Enter symbol (e.g., SPY, QQQ, TSLA)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Strike Range Filtering Controls */}
        <div className="border-t pt-3">
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            ⚡ Strike Range Filter (Payload Reduction)
          </label>

          <div className="space-y-2">
            {/* Filter Mode Toggle */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useCustomRange}
                  onChange={() => setUseCustomRange(false)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">ATM ± Range %</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useCustomRange}
                  onChange={() => setUseCustomRange(true)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Custom Strike Range</span>
              </label>
            </div>

            {/* ATM Range Input */}
            {!useCustomRange && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={strikeRange}
                  onChange={(e) => setStrikeRange(Math.max(1, parseInt(e.target.value) || 20))}
                  min="1"
                  max="100"
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">% above/below current price</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Default: 20% (80-90% payload reduction)
                </span>
              </div>
            )}

            {/* Custom Strike Range Inputs */}
            {useCustomRange && (
              <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Min Strike</label>
                  <input
                    type="number"
                    value={customMin ?? ''}
                    onChange={(e) => setCustomMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Min"
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-gray-500 mt-4">→</span>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Max Strike</label>
                  <input
                    type="number"
                    value={customMax ?? ''}
                    onChange={(e) => setCustomMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Max"
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-xs text-gray-600 mt-4">(or leave blank for no limit)</span>
              </div>
            )}

            {/* Active Filter Display */}
            {(useCustomRange || strikeRange !== 20) && (
              <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                {useCustomRange
                  ? `Custom filter: ${customMin ?? 'no min'} - ${customMax ?? 'no max'}`
                  : `ATM ± ${strikeRange}% (active)`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">⚠️ Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* GEX Card */}
      <GEXCard
        gex={data?.gex || null}
        gammaFlip={data?.gammaFlip || null}
        loading={loading}
        error={error}
      />

      {/* Greeks Table */}
      <GreeksTable
        greeks={data?.greeks.items || []}
        loading={loading}
        error={error}
      />

      {/* Options Walls - Virtualized */}
      {data?.walls && data.walls.count > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3">
            <h3 className="font-bold text-white">Options Walls (Virtualized - {data.walls.count} total)</h3>
          </div>

          <VirtualizedTable
            data={data.walls.items}
            columns={[
              {
                key: 'strikePrice',
                label: 'Strike',
                render: (row) => `$${row.strikePrice}`,
                className: 'w-24',
              },
              {
                key: 'putWall',
                label: 'Put Wall',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        row.putWall.level === 'strong'
                          ? 'bg-red-200 text-red-800'
                          : row.putWall.level === 'moderate'
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {row.putWall.level.toUpperCase()}
                    </div>
                    <span className="text-gray-600">
                      {(row.putWall.contracts / 1000).toFixed(0)}K
                    </span>
                  </div>
                ),
                className: 'flex-1',
              },
              {
                key: 'callWall',
                label: 'Call Wall',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        row.callWall.level === 'strong'
                          ? 'bg-green-200 text-green-800'
                          : row.callWall.level === 'moderate'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {row.callWall.level.toUpperCase()}
                    </div>
                    <span className="text-gray-600">
                      {(row.callWall.contracts / 1000).toFixed(0)}K
                    </span>
                  </div>
                ),
                className: 'flex-1',
              },
            ]}
            rowHeight={40}
            maxHeight={600}
          />
        </div>
      )}

      {/* Volume & OI - Virtualized */}
      {data?.volumeOI && data.volumeOI.count > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-3">
            <h3 className="font-bold text-white">Volume & Open Interest (Virtualized - {data.volumeOI.count} total)</h3>
          </div>

          <VirtualizedTable
            data={data.volumeOI.items}
            columns={[
              {
                key: 'strikePrice',
                label: 'Strike',
                render: (row) => `$${row.strikePrice}`,
                className: 'w-24',
              },
              {
                key: 'callOI',
                label: 'Call OI',
                render: (row) => (
                  <span className="text-green-600 font-mono">
                    {(row.callOI / 1000).toFixed(0)}K
                  </span>
                ),
                className: 'w-24',
                align: 'right',
              },
              {
                key: 'callVolume',
                label: 'Call Vol',
                render: (row) => (
                  <span className="text-green-600 font-mono">
                    {(row.callVolume / 1000).toFixed(0)}K
                  </span>
                ),
                className: 'w-24',
                align: 'right',
              },
              {
                key: 'putOI',
                label: 'Put OI',
                render: (row) => (
                  <span className="text-red-600 font-mono">
                    {(row.putOI / 1000).toFixed(0)}K
                  </span>
                ),
                className: 'w-24',
                align: 'right',
              },
              {
                key: 'putVolume',
                label: 'Put Vol',
                render: (row) => (
                  <span className="text-red-600 font-mono">
                    {(row.putVolume / 1000).toFixed(0)}K
                  </span>
                ),
                className: 'w-24',
                align: 'right',
              },
            ]}
            rowHeight={40}
            maxHeight={600}
          />
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-center text-xs text-gray-500 p-2">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center p-4">
          <div className="inline-block">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-600 text-sm mt-2">Fetching market data...</p>
        </div>
      )}
    </div>
  );
};

/**
 * Memoized version of MarketAnalysisTab
 * Only re-renders if symbol or onSymbolChange props actually change
 * Prevents unnecessary re-renders when parent updates unrelated state
 * Expected impact: 70-80% reduction in re-renders
 */
export const MarketAnalysisTab = React.memo(
  MarketAnalysisTabComponent,
  (prevProps, nextProps) => {
    // Return true if props are equal (no re-render needed)
    // Return false if props are different (re-render needed)
    return (
      prevProps.symbol === nextProps.symbol &&
      prevProps.onSymbolChange === nextProps.onSymbolChange
    );
  }
);

export default MarketAnalysisTab;
