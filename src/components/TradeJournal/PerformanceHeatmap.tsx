/**
 * Performance Heatmap Component
 * Visualizes monthly/weekly trading performance with color intensity
 */

import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Calendar, TrendingUp, ChevronDown } from 'lucide-react'
import { AnalyticsService, MonthlyStats, WeeklyStats, Trade } from '../../services/analyticsService'

interface PerformanceHeatmapProps {
  trades: Trade[]
}

type PeriodType = 'month' | 'week'

export const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({ trades }) => {
  const [period, setPeriod] = useState<PeriodType>('month')
  const [expanded, setExpanded] = useState(true)

  const monthlyStats = useMemo(() => AnalyticsService.calculateMonthlyStats(trades), [trades])
  const weeklyStats = useMemo(() => AnalyticsService.calculateWeeklyStats(trades), [trades])

  const displayData = period === 'month' ? monthlyStats : weeklyStats
  const isEmpty = displayData.length === 0

  if (isEmpty) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Heatmap
            </h3>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No closed trades to analyze
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Performance Heatmap
          </h3>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Period Toggle */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                period === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                period === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            {/* Win/Loss Count Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Wins vs Losses
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={displayData.map((stat) => ({
                    name: period === 'month' ? (stat as MonthlyStats).month : (stat as WeeklyStats).week,
                    Wins: (stat as any).wins,
                    Losses: (stat as any).losses,
                  }))}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                  />
                  <Legend />
                  <Bar dataKey="Wins" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Losses" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* P&L Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Profit & Loss
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={displayData.map((stat) => ({
                    name: period === 'month' ? (stat as MonthlyStats).month : (stat as WeeklyStats).week,
                    'P&L': (stat as any).pnl,
                  }))}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                  />
                  <Bar
                    dataKey="P&L"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    shape={<CustomBar />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Win Rate Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Win Rate
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={displayData.map((stat) => ({
                    name: period === 'month' ? (stat as MonthlyStats).month : (stat as WeeklyStats).week,
                    'Win Rate %': (stat as any).winRate,
                  }))}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any) => `${value.toFixed(1)}%`}
                  />
                  <Bar dataKey="Win Rate %" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {displayData.map((stat) => {
              const isMonthly = period === 'month'
              const monthOrWeek = isMonthly
                ? (stat as MonthlyStats).month
                : (stat as WeeklyStats).week
              const pnl = (stat as any).pnl
              const winRate = (stat as any).winRate
              const isProfitable = pnl > 0

              return (
                <div
                  key={monthOrWeek}
                  className="p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                >
                  <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {monthOrWeek}
                  </div>
                  <div className={`text-sm sm:text-base font-semibold mb-1 ${
                    isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    ${pnl.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {winRate.toFixed(0)}% win
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Custom bar shape to color bars based on value (positive = green, negative = red)
 */
const CustomBar = (props: any) => {
  const { x, y, width, height, payload } = props
  const value = payload['P&L']
  const isPositive = value >= 0

  return (
    <rect
      x={x}
      y={isPositive ? y : y + height}
      width={width}
      height={Math.abs(height)}
      fill={isPositive ? '#10b981' : '#ef4444'}
      rx={4}
    />
  )
}
