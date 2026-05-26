import React, { ReactNode } from 'react';
import { FixedSizeList as List } from 'react-window';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T, key: string) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  headerClassName?: string;
  rowClassName?: string;
  getRowClassName?: (index: number) => string;
}

export const VirtualizedTable = React.memo(
  function VirtualizedTableComponent<T extends Record<string, any>>({
    data,
    columns,
    rowHeight = 40,
    maxHeight = 600,
    headerClassName = '',
    rowClassName = '',
    getRowClassName,
  }: VirtualizedTableProps<T>) {
    if (!data || data.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          No data available
        </div>
      );
    }

    // Calculate actual height: show up to 15 rows or all data if less
    const visibleRows = Math.min(15, data.length);
    const calculatedHeight = Math.min(visibleRows * rowHeight + 50, maxHeight);

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = data[index];
      if (!row) return null;

      const dynamicRowClass = getRowClassName?.(index) || '';

      return (
        <div
          style={style}
          className={`flex border-b border-gray-100 hover:bg-gray-50 ${rowClassName} ${dynamicRowClass}`}
        >
          {columns.map((col, colIdx) => (
            <div
              key={colIdx}
              className={`flex items-center px-4 py-2 ${
                col.className || 'flex-1'
              } ${
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
              }`}
            >
              {col.render
                ? col.render(row, col.key as string)
                : String(row[col.key as keyof T] ?? '')}
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className={`flex bg-gray-50 border-b border-gray-200 ${headerClassName}`}>
          {columns.map((col, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 font-semibold text-sm text-gray-700 ${
                col.className || 'flex-1'
              } ${
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
              }`}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Virtual List */}
        <List
          height={calculatedHeight}
          itemCount={data.length}
          itemSize={rowHeight}
          width="100%"
          className="w-full"
        >
          {Row}
        </List>

        {/* Footer with count */}
        {data.length > visibleRows && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            Showing {visibleRows} of {data.length} rows (scrollable)
          </div>
        )}
      </div>
    );
  }
) as <T extends Record<string, any>>(props: VirtualizedTableProps<T>) => JSX.Element;

export default VirtualizedTable;
