import React from 'react'
import { StrategyPerformance } from '../../types'

interface StrategyPerformanceTableProps {
  data: StrategyPerformance[]
}

/**
 * Strategy Performance Table Component
 * Display performance breakdown by trading strategy
 */
export const StrategyPerformanceTable: React.FC<StrategyPerformanceTableProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No strategy data available yet
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Strategy</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Trades</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Wins</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Losses</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Win Rate</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">P&L</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Avg Trade</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Best</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Worst</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Profit Factor</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b border-gray-100 hover:bg-gray-50 transition"
            >
              <td className="py-3 px-4 font-medium text-gray-900">{row.strategy}</td>
              <td className="text-right py-3 px-4 text-gray-700">{row.total_trades}</td>
              <td className="text-right py-3 px-4 text-green-600 font-semibold">
                {row.winning_trades}
              </td>
              <td className="text-right py-3 px-4 text-red-600 font-semibold">
                {row.losing_trades}
              </td>
              <td className="text-right py-3 px-4 text-gray-700">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    row.win_rate >= 50
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {row.win_rate.toFixed(1)}%
                </span>
              </td>
              <td
                className={`text-right py-3 px-4 font-semibold ${
                  row.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {row.total_profit_loss >= 0 ? '+' : ''}${row.total_profit_loss.toFixed(2)}
              </td>
              <td
                className={`text-right py-3 px-4 ${
                  row.average_trade >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {row.average_trade >= 0 ? '+' : ''}${row.average_trade.toFixed(2)}
              </td>
              <td className="text-right py-3 px-4 text-green-600 font-semibold">
                ${row.best_trade.toFixed(2)}
              </td>
              <td className="text-right py-3 px-4 text-red-600 font-semibold">
                ${row.worst_trade.toFixed(2)}
              </td>
              <td className="text-right py-3 px-4 font-semibold text-gray-900">
                {row.profit_factor.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StrategyPerformanceTable
