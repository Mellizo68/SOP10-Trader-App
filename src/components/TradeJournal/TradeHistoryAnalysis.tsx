/**
 * Trade History Analysis Component
 * Displays trade duration statistics, distribution, and hold time analysis
 */

import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Clock, TrendingUp, ChevronDown } from 'lucide-react'
import { AnalyticsService, DurationStats, Trade } from '../../services/analyticsService'

interface TradeHistoryAnalysisProps {
  trades: Trade[]
}

const DURATION_COLORS: Record<string, string> = {
  '< 1 hour': '#f97316',      // orange
  '1-4 hours': '#eab308',     // yellow
  '4-24 hours': '#3b82f6',    // blue
  '1-7 days': '#8b5cf6',      // purple
  '> 7 days': '#ec4899',      // pink
}

export const TradeHistoryAnalysis: React.FC<TradeHistoryAnalysisProps> = ({ trades }) => {
  const [expanded, setExpanded] = useState(true)

  const durationStats = useMemo(() => AnalyticsService.calculateDurationStats(trades), [trades])
  const durationDistribution = useMemo(() => AnalyticsService.calculateDurationDistribution(trades), [trades])

  const closedTradesCount = trades.filter(t => t.status === 'closed').length
  const isEmpty = closedTradesCount === 0

  if (isEmpty) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trade Duration Analysis
            </h3>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No closed trades to analyze
        </div>
      </div>
    )
  }

  // Prepare distribution data for charts from the ranges array
  const distributionData = durationDistribution.ranges.filter(r => r.count > 0).map(range => ({
    name: range.label,
    count: range.count,
    percentage: range.percentage,
  }))

  // Timeline data: show average hold time by trade sequence
  const timelineData = trades
    .filter(t => t.status === 'closed')
    .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
    .slice(-20) // Last 20 trades for timeline clarity
    .map((trade, index) => {
      const entryDate = new Date(trade.entry_date)
      const exitDate = new Date(trade.exit_date!)
      const holdHours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60)

      return {
        index: index + 1,
        holdHours: parseFloat(holdHours.toFixed(2)),
        symbol: trade.symbol,
      }
    })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Trade Duration Analysis
          </h3>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-6">
          {/* Duration Statistics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-900">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Hold Time</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {durationStats.avgHoldTime.toFixed(1)}h
              </div>
            </div>

            <div className="bg-green-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-900">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Median Hold</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {durationStats.medianHoldTime.toFixed(1)}h
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 border border-orange-200 dark:border-orange-900">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Shortest</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {durationStats.shortestHold.hours.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{durationStats.shortestHold.symbol}</div>
            </div>

            <div className="bg-purple-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-900">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Longest</div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                {durationStats.longestHold.hours.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{durationStats.longestHold.symbol}</div>
            </div>

            <div className="bg-pink-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 border border-pink-200 dark:border-pink-900">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Trades</div>
              <div className="text-xl sm:text-2xl font-bold text-pink-600 dark:text-pink-400">
                {closedTradesCount}
              </div>
            </div>
          </div>

          {/* Duration Distribution */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Hold Time Distribution
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DURATION_COLORS[entry.name as keyof typeof DURATION_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} trades`} />
                </PieChart>
              </ResponsiveContainer>

              {/* Bar Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} trades`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={DURATION_COLORS[entry.name as keyof typeof DURATION_COLORS]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hold Time Timeline */}
          {timelineData.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Recent Hold Times (Last 20 Trades)
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="index"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    label={{ value: 'Trade #', position: 'insideBottomRight', offset: -10 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}h`, 'Hold Time']}
                    labelFormatter={(label) => `Trade #${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="holdHours"
                    stroke="#3b82f6"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Hold Hours"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Duration Statistics Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Duration by Hold Time Category
            </h4>
            <div className="space-y-2">
              {durationDistribution.ranges.map(({ label, count, percentage }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: DURATION_COLORS[label] || '#6b7280',
                      }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: DURATION_COLORS[label] || '#6b7280',
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
