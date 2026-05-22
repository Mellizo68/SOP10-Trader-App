import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { GEXData, GammaFlipData } from '../../hooks/useMarketData';

interface GEXCardProps {
  gex: GEXData | null;
  gammaFlip: GammaFlipData | null;
  loading: boolean;
  error: string | null;
}

/**
 * GEX Card Component
 * Displays Gamma Exposure data and Gamma Flip warning
 */
export const GEXCard: React.FC<GEXCardProps> = ({ gex, gammaFlip, loading, error }) => {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">Error loading GEX data</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-blue-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-blue-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-blue-200 rounded w-40"></div>
      </div>
    );
  }

  if (!gex) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-500">No GEX data available</p>
      </div>
    );
  }

  const isFlipWarning = gammaFlip && Math.abs(gammaFlip.strength) > 0.7;
  const flipDirection = gammaFlip?.direction === 'up' ? '📈' : gammaFlip?.direction === 'down' ? '📉' : '➡️';

  return (
    <div className={`rounded-lg p-4 border-2 transition-all ${
      isFlipWarning
        ? 'bg-amber-50 border-amber-300'
        : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
    }`}>
      <div className="space-y-3">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">GEX (Gamma Exposure)</h3>
          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
            {gex.symbol}
          </span>
        </div>

        {/* GEX Value */}
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-2xl font-bold text-blue-600">
            ${(gex.gex / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {gex.gexPercent > 0 ? '📈' : '📉'} {gex.gexPercent.toFixed(2)}% GEX
          </div>
        </div>

        {/* Gamma Flip Warning */}
        {isFlipWarning && gammaFlip && (
          <div className="bg-amber-100 border border-amber-300 rounded p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">
                  ⚠️ Gamma Flip Alert
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  Flip level: <span className="font-bold">${gammaFlip.flipLevel}</span>
                </p>
                <p className="text-amber-700 text-xs">
                  Direction: {flipDirection} {gammaFlip.direction.toUpperCase()}
                </p>
                <p className="text-amber-700 text-xs">
                  Strength: {(gammaFlip.strength * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 text-right">
          Last updated: {new Date(gex.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default GEXCard;
