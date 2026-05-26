import { useState } from 'react'
import { useAdvancedMetrics } from '../../hooks/useAdvancedMetrics'
import { OrderFlowChart } from './OrderFlowChart'
import { VolatilityTermStructureChart } from './VolatilityTermStructureChart'
import { VolSkewChart } from './VolSkewChart'
import { Level2OrderBook } from './Level2OrderBook'
import { AlertCircle, Activity, TrendingUp, BarChart3, BookOpen, Zap } from 'lucide-react'

interface AdvancedMetricsTabProps {
  symbol: string
}

type ActiveTab = 'order-flow' | 'vol-term' | 'vol-skew' | 'level2'

export function AdvancedMetricsTab({ symbol }: AdvancedMetricsTabProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('order-flow')
  const metricsState = useAdvancedMetrics({ symbol })

  const latencyIndicator = metricsState.isConnected
    ? { label: '<500ms', color: 'text-green-600', bg: 'bg-green-50' }
    : metricsState.isFailed
    ? { label: '5s (fallback)', color: 'text-orange-600', bg: 'bg-orange-50' }
    : { label: 'Connecting...', color: 'text-blue-600', bg: 'bg-blue-50' }

  const tabs = [
    {
      id: 'order-flow' as const,
      label: 'Order Flow',
      icon: Activity,
      enabled: !!metricsState.orderFlow
    },
    {
      id: 'vol-term' as const,
      label: 'Vol Term Structure',
      icon: TrendingUp,
      enabled: !!metricsState.volatilityTermStructure
    },
    {
      id: 'vol-skew' as const,
      label: 'Vol Skew',
      icon: BarChart3,
      enabled: !!metricsState.volatilitySkew
    },
    {
      id: 'level2' as const,
      label: 'Level 2 Book',
      icon: BookOpen,
      enabled: !!metricsState.level2OrderBook
    }
  ]

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={`${latencyIndicator.bg} border border-current rounded-lg p-4`}>
        <div className="flex items-center gap-3">
          <Zap className={`${latencyIndicator.color} w-5 h-5`} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">
              {metricsState.isConnected
                ? 'Real-time streaming active'
                : metricsState.isFailed
                ? 'Using REST fallback (limited frequency)'
                : 'Connecting to WebSocket...'}
            </div>
            <div className={`text-xs ${latencyIndicator.color}`}>
              Latency: {latencyIndicator.label}
            </div>
          </div>
          {metricsState.lastUpdate && (
            <div className="text-xs text-slate-600">
              Last update: {new Date(metricsState.lastUpdate).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* No Data Available Message */}
      {!metricsState.orderFlow && !metricsState.volatilityTermStructure && !metricsState.volatilitySkew && !metricsState.level2OrderBook && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="text-sm text-amber-900">
            Advanced metrics data will appear here once the data stream connects. Backend must support advanced metrics endpoints.
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      {tabs.some(t => t.enabled) && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={!tab.enabled}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Tab Content */}
      {tabs.some(t => t.enabled) && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {activeTab === 'order-flow' && (
            <OrderFlowChart
              data={metricsState.orderFlow}
              symbol={symbol}
              isLoading={!metricsState.orderFlow && metricsState.isConnected}
            />
          )}

          {activeTab === 'vol-term' && (
            <VolatilityTermStructureChart
              data={metricsState.volatilityTermStructure}
              symbol={symbol}
              isLoading={!metricsState.volatilityTermStructure && metricsState.isConnected}
            />
          )}

          {activeTab === 'vol-skew' && (
            <VolSkewChart
              data={metricsState.volatilitySkew}
              symbol={symbol}
              isLoading={!metricsState.volatilitySkew && metricsState.isConnected}
            />
          )}

          {activeTab === 'level2' && (
            <Level2OrderBook
              bids={metricsState.level2OrderBook?.bids || null}
              asks={metricsState.level2OrderBook?.asks || null}
              symbol={symbol}
              isLoading={!metricsState.level2OrderBook && metricsState.isConnected}
            />
          )}
        </div>
      )}
    </div>
  )
}
