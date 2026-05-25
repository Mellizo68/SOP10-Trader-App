import React from 'react'
import { AnalyticsSummary, WinLossStats } from '../../types'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface AnalyticsMetricsCardsProps {
  summary: AnalyticsSummary
  winLoss: WinLossStats
}

/**
 * Analytics Metrics Cards Component
 * Display key performance indicators in card format
 */
export const AnalyticsMetricsCards: React.FC<AnalyticsMetricsCardsProps> = ({
  summary,
  winLoss,
}) => {
  const metrics = [
    {
      label: 'Total Trades',
      value: summary.total_trades,
      color: 'bg-blue-50',
      textColor: 'text-blue-900',
      icon: '📊',
    },
    {
      label: 'Win Rate',
      value: `${summary.win_rate.toFixed(1)}%`,
      color: 'bg-green-50',
      textColor: 'text-green-900',
      icon: '✅',
      target: summary.win_rate >= 50 ? 'success' : 'warning',
    },
    {
      label: 'Profit Factor',
      value: summary.profit_factor.toFixed(2),
      color: 'bg-purple-50',
      textColor: 'text-purple-900',
      icon: '💰',
      subtitle: `${summary.total_profit_loss > 0 ? '+' : ''}$${summary.total_profit_loss.toFixed(2)}`,
    },
    {
      label: 'Sharpe Ratio',
      value: summary.sharpe_ratio.toFixed(2),
      color: 'bg-orange-50',
      textColor: 'text-orange-900',
      icon: '📈',
    },
    {
      label: 'Max Drawdown',
      value: `${Math.abs(summary.max_drawdown).toFixed(1)}%`,
      color: 'bg-red-50',
      textColor: 'text-red-900',
      icon: '📉',
    },
    {
      label: 'Risk/Reward Ratio',
      value: summary.risk_reward_ratio.toFixed(2),
      color: 'bg-indigo-50',
      textColor: 'text-indigo-900',
      icon: '⚖️',
    },
    {
      label: 'Average Win',
      value: `$${summary.average_win.toFixed(2)}`,
      color: 'bg-teal-50',
      textColor: 'text-teal-900',
      icon: '↗️',
    },
    {
      label: 'Average Loss',
      value: `$${summary.average_loss.toFixed(2)}`,
      color: 'bg-pink-50',
      textColor: 'text-pink-900',
      icon: '↘️',
    },
    {
      label: 'Best Trade',
      value: `$${summary.best_trade.toFixed(2)}`,
      color: 'bg-emerald-50',
      textColor: 'text-emerald-900',
      icon: '🏆',
    },
    {
      label: 'Worst Trade',
      value: `$${summary.worst_trade.toFixed(2)}`,
      color: 'bg-rose-50',
      textColor: 'text-rose-900',
      icon: '⚠️',
    },
    {
      label: 'Win Streak',
      value: summary.win_streak_max,
      color: 'bg-cyan-50',
      textColor: 'text-cyan-900',
      icon: '🔥',
    },
    {
      label: 'Loss Streak',
      value: summary.loss_streak_max,
      color: 'bg-slate-50',
      textColor: 'text-slate-900',
      icon: '❄️',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`${metric.color} border border-gray-200 rounded-lg p-4 transition hover:shadow-md`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 mb-1">{metric.label}</p>
              <p className={`text-2xl font-bold ${metric.textColor}`}>{metric.value}</p>
              {metric.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
              )}
            </div>
            <span className="text-2xl">{metric.icon}</span>
          </div>
          {metric.target === 'success' && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
              <CheckCircle2 className="w-3 h-3" />
              <span>Above 50%</span>
            </div>
          )}
          {metric.target === 'warning' && (
            <div className="mt-2 flex items-center gap-1 text-xs text-orange-700">
              <AlertCircle className="w-3 h-3" />
              <span>Below 50%</span>
            </div>
          )}
        </div>
      ))}

      {/* Summary Stats Box */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-1 xl:col-span-4">
        <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600">Winning Trades</p>
            <p className="text-lg font-bold text-green-600">{summary.winning_trades}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Losing Trades</p>
            <p className="text-lg font-bold text-red-600">{summary.losing_trades}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Winning Ratio</p>
            <p className="text-lg font-bold text-blue-600">
              {winLoss.winning_ratio.toFixed(2)}:1
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Recovery Factor</p>
            <p className="text-lg font-bold text-purple-600">
              {summary.recovery_factor.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsMetricsCards
