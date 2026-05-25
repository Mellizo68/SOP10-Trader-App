import React, { useState, useEffect } from 'react'
import { apiClient } from '../../api/tradeClient'
import {
  AnalyticsSummary,
  StrategyPerformance,
  PeriodPerformance,
  WinLossStats,
} from '../../types'
import AnalyticsMetricsCards from './AnalyticsMetricsCards'
import StrategyPerformanceTable from './StrategyPerformanceTable'
import PeriodPerformanceChart from './PeriodPerformanceChart'

/**
 * Analytics Tab Component
 * Main interface for viewing comprehensive trading analytics and performance metrics
 */
export const AnalyticsTab: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [strategies, setStrategies] = useState<StrategyPerformance[]>([])
  const [periods, setPeriods] = useState<PeriodPerformance[]>([])
  const [winLoss, setWinLoss] = useState<WinLossStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [periodType, setPeriodType] = useState<'month' | 'week'>('month')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Load all analytics data
  useEffect(() => {
    loadAnalyticsData()
  }, [periodType])

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const [summaryData, strategiesData, periodsData, winLossData] = await Promise.all([
        apiClient.getAnalyticsSummary(),
        apiClient.getAnalyticsByStrategy(),
        apiClient.getAnalyticsByPeriod(periodType),
        apiClient.getWinLossStats(),
      ])

      setSummary(summaryData)
      setStrategies(strategiesData)
      setPeriods(periodsData)
      setWinLoss(winLossData)
      setLastRefresh(new Date())
    } catch (err) {
      setError('Failed to load analytics data')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setIsLoading(true)
      setError('')
      await apiClient.refreshAnalytics()
      await loadAnalyticsData()
    } catch (err) {
      setError('Failed to refresh analytics')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trading Analytics</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive performance analysis and metrics across all trades
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition"
            title="Recalculate analytics metrics"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Last Refresh Info */}
      {lastRefresh && (
        <div className="text-xs text-gray-500 text-right">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          {summary && winLoss && (
            <AnalyticsMetricsCards summary={summary} winLoss={winLoss} />
          )}

          {/* Period Performance Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Performance Over Time</h3>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as 'month' | 'week')}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">Monthly</option>
                <option value="week">Weekly</option>
              </select>
            </div>
            <PeriodPerformanceChart data={periods} periodType={periodType} />
          </div>

          {/* Strategy Performance Table */}
          {strategies.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Performance</h3>
              <StrategyPerformanceTable data={strategies} />
            </div>
          )}

          {/* Empty State */}
          {!summary || summary.total_trades === 0 && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600 text-lg">
                No trades yet. Complete your first trade to see analytics.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AnalyticsTab
