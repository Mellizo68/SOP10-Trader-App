import React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { PeriodPerformance } from '../../types'

interface PeriodPerformanceChartProps {
  data: PeriodPerformance[]
  periodType: 'month' | 'week'
}

/**
 * Period Performance Chart Component
 * Display performance metrics over time using Recharts
 */
export const PeriodPerformanceChart: React.FC<PeriodPerformanceChartProps> = ({
  data,
  periodType,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No performance data available yet
      </div>
    )
  }

  // Sort data by period (ascending - oldest first)
  const sortedData = [...data].reverse()

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg text-xs">
          <p className="font-semibold text-gray-900">{data.period}</p>
          <p className="text-gray-700">Trades: {data.total_trades}</p>
          <p className="text-green-600">Wins: {data.winning_trades}</p>
          <p className="text-red-600">Losses: {data.losing_trades}</p>
          <p className="text-blue-600 font-semibold">
            P&L: ${data.profit_loss >= 0 ? '+' : ''}
            {data.profit_loss.toFixed(2)}
          </p>
          <p className="text-purple-600">Win Rate: {data.win_rate.toFixed(1)}%</p>
          <p className="text-gray-700">Avg Trade: ${data.average_trade.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Profit/Loss Chart */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Profit/Loss by {periodType === 'month' ? 'Month' : 'Week'}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="profit_loss"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="P&L ($)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Win Rate Trend */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Win Rate Trend</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="win_rate"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              name="Win Rate (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trade Count Chart */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Trade Distribution</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="winning_trades"
              fill="#10b981"
              name="Winning Trades"
              stackId="trades"
            />
            <Bar
              dataKey="losing_trades"
              fill="#ef4444"
              name="Losing Trades"
              stackId="trades"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div>
          <p className="text-xs text-gray-600 mb-1">Total Periods</p>
          <p className="text-xl font-bold text-gray-900">{sortedData.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Total Trades</p>
          <p className="text-xl font-bold text-gray-900">
            {sortedData.reduce((sum, p) => sum + p.total_trades, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Total P&L</p>
          <p
            className={`text-xl font-bold ${
              sortedData.reduce((sum, p) => sum + p.profit_loss, 0) >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            ${(sortedData.reduce((sum, p) => sum + p.profit_loss, 0)).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Avg Win Rate</p>
          <p className="text-xl font-bold text-gray-900">
            {(sortedData.reduce((sum, p) => sum + p.win_rate, 0) / sortedData.length).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  )
}

export default PeriodPerformanceChart
