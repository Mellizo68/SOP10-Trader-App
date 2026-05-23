/**
 * Streaks Analysis Component
 * Displays win/loss streak patterns and probabilities
 */

import React, { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'
import { AnalyticsService, StreakData, Trade } from '../../services/analyticsService'

interface StreaksAnalysisProps {
  trades: Trade[]
}

export const StreaksAnalysis: React.FC<StreaksAnalysisProps> = ({ trades }) => {
  const [expanded, setExpanded] = useState(true)

  const streakData = useMemo(() => AnalyticsService.calculateStreaks(trades), [trades])

  const isEmpty = streakData.current === 'none' && streakData.allStreaks.length === 0

  if (isEmpty) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Win/Loss Streaks
            </h3>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No closed trades to analyze
        </div>
      </div>
    )
  }

  // Prepare streak timeline data
  const timelineData = streakData.allStreaks.map((streak, index) => ({
    index: index + 1,
    streak: streak.type === 'win' ? 'W' : 'L',
    count: streak.count,
    type: streak.type,
  }))

  // Calculate probability of current streak continuing
  const streakContinuationProbability = AnalyticsService.getWinProbability(streakData.currentCount)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Win/Loss Streaks
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
          {/* Current Streak */}
          {streakData.current !== 'none' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 rounded-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-900">
              <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Current Streak
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`text-5xl sm:text-6xl font-bold ${
                    streakData.current === 'win'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {streakData.currentCount}
                </div>
                <div>
                  <div
                    className={`text-lg font-bold ${
                      streakData.current === 'win'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {streakData.current === 'win' ? 'WINS' : 'LOSSES'}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Since {new Date(streakData.current === 'win' ? streakData.winStreakDate : streakData.lossStreakDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Probability */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Probability of {streakData.current === 'win' ? 'next win' : 'next loss'}
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {streakContinuationProbability.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ({streakData.currentCount} in a row)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Longest Streaks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Longest Win Streak */}
            <div className="bg-green-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 border border-green-200 dark:border-green-900">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Longest Win Streak
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
                    {streakData.longestWinStreak}
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              {streakData.winStreakDate && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Started {new Date(streakData.winStreakDate).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Longest Loss Streak */}
            <div className="bg-red-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 border border-red-200 dark:border-red-900">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Longest Loss Streak
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-red-600 dark:text-red-400">
                    {streakData.longestLossStreak}
                  </div>
                </div>
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              {streakData.lossStreakDate && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Started {new Date(streakData.lossStreakDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Streak Timeline */}
          {timelineData.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Streak Timeline
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="streak"
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
                    formatter={(value) => `${value} trades`}
                  />
                  <Bar
                    dataKey="count"
                    radius={[8, 8, 0, 0]}
                    shape={<CustomStreakBar />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Streak Statistics Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Streak Statistics
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Streaks</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {streakData.allStreaks.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Average Streak</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {(
                    streakData.allStreaks.reduce((sum, s) => sum + s.count, 0) /
                    (streakData.allStreaks.length || 1)
                  ).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Win Streaks</div>
                <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                  {streakData.allStreaks.filter((s) => s.type === 'win').length}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Loss Streaks</div>
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  {streakData.allStreaks.filter((s) => s.type === 'loss').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Custom bar to color streaks based on win/loss
 */
const CustomStreakBar = (props: any) => {
  const { x, y, width, height, payload } = props
  const isWin = payload.type === 'win'

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={isWin ? '#10b981' : '#ef4444'}
      rx={4}
    />
  )
}
