import React from 'react';
import type { GreeksData } from '../../hooks/useMarketData';
import { VirtualizedTable } from '../VirtualizedTable';
import { useRowChangeAnimation } from '../../hooks/useRowChangeAnimation';

interface GreeksTableProps {
  greeks: GreeksData[];
  loading: boolean;
  error: string | null;
}

/**
 * Greeks Table Component
 * Displays Delta, Gamma, Theta, Vega, IV for multiple options
 */
const GreeksTableComponent: React.FC<GreeksTableProps> = ({ greeks, loading, error }) => {
  const animatingRows = useRowChangeAnimation(greeks, 'strike');

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-medium">Error loading Greeks data</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!greeks || greeks.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-500">No Greeks data available</p>
      </div>
    );
  }

  // Use virtualized table for large datasets
  // render all greeks using virtual scrolling instead of just top 5
  const columns = [
    {
      key: 'strike',
      label: 'Strike',
      render: (row: GreeksData) => `$${row.strike}`,
      className: 'w-20',
    },
    {
      key: 'expiration',
      label: 'Exp',
      render: (row: GreeksData) =>
        new Date(row.expiration).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      className: 'w-20',
    },
    {
      key: 'optionType',
      label: 'Type',
      render: (row: GreeksData) => (
        <span
          className={`px-2 py-1 rounded font-bold text-xs ${
            row.optionType === 'call'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.optionType === 'call' ? 'CALL' : 'PUT'}
        </span>
      ),
      className: 'w-16',
      align: 'center' as const,
    },
    {
      key: 'delta',
      label: 'Δ Delta',
      render: (row: GreeksData) => (
        <span className="text-blue-600 font-semibold">
          {row.delta > 0 ? '+' : ''}{row.delta.toFixed(3)}
        </span>
      ),
      className: 'w-24',
      align: 'right' as const,
    },
    {
      key: 'gamma',
      label: 'Γ Gamma',
      render: (row: GreeksData) => (
        <span className="text-purple-600 font-semibold">
          {row.gamma.toFixed(4)}
        </span>
      ),
      className: 'w-24',
      align: 'right' as const,
    },
    {
      key: 'theta',
      label: 'Θ Theta',
      render: (row: GreeksData) => (
        <span className="text-red-600 font-semibold">
          {row.theta.toFixed(3)}
        </span>
      ),
      className: 'w-24',
      align: 'right' as const,
    },
    {
      key: 'vega',
      label: 'ν Vega',
      render: (row: GreeksData) => (
        <span className="text-green-600 font-semibold">
          {row.vega.toFixed(3)}
        </span>
      ),
      className: 'w-24',
      align: 'right' as const,
    },
    {
      key: 'iv',
      label: 'IV %',
      render: (row: GreeksData) => (
        <span className="text-orange-600 font-semibold">
          {row.iv.toFixed(1)}%
        </span>
      ),
      className: 'w-20',
      align: 'right' as const,
    },
    {
      key: 'price',
      label: 'Price',
      render: (row: GreeksData) => (
        <span className="font-semibold text-gray-900">
          ${row.price.toFixed(2)}
        </span>
      ),
      className: 'w-24',
      align: 'right' as const,
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3">
        <h3 className="font-bold text-white">Greeks (Virtualized - {greeks.length} Options)</h3>
      </div>

      <VirtualizedTable
        data={greeks}
        columns={columns}
        rowHeight={40}
        maxHeight={600}
        getRowClassName={(index) => {
          const strike = greeks[index]?.strike;
          return animatingRows.has(strike) ? 'animate-row-highlight' : '';
        }}
      />
    </div>
  );
};

/**
 * Memoized version of GreeksTable
 * Only re-renders if greeks data content actually changes
 * Shallow comparison on loading and error flags
 * Expected impact: 60-70% reduction in re-renders when parent updates
 */
export const GreeksTable = React.memo(
  GreeksTableComponent,
  (prevProps, nextProps) => {
    // Quick equality checks for loading and error
    if (prevProps.loading !== nextProps.loading || prevProps.error !== nextProps.error) {
      return false; // Props changed, re-render needed
    }

    // Deep comparison for greeks array
    if (prevProps.greeks.length !== nextProps.greeks.length) {
      return false; // Different array length, re-render needed
    }

    // Check if greeks content is the same
    for (let i = 0; i < prevProps.greeks.length; i++) {
      const prev = prevProps.greeks[i];
      const next = nextProps.greeks[i];

      // Compare key properties that affect rendering
      if (
        prev.strike !== next.strike ||
        prev.expiration !== next.expiration ||
        prev.optionType !== next.optionType ||
        prev.delta !== next.delta ||
        prev.gamma !== next.gamma ||
        prev.theta !== next.theta ||
        prev.vega !== next.vega ||
        prev.iv !== next.iv ||
        prev.price !== next.price
      ) {
        return false; // Content changed, re-render needed
      }
    }

    return true; // Props are equal, skip re-render
  }
);

export default GreeksTable;
