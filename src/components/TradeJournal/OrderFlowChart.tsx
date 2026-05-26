import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts'
import { OrderFlow } from '../../types/advancedMetrics'

interface OrderFlowChartProps {
  data: OrderFlow | null
  symbol: string
  isLoading?: boolean
}

export function OrderFlowChart({ data, symbol, isLoading }: OrderFlowChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">Loading order flow data...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">No order flow data available</span>
      </div>
    )
  }

  const chartData = [
    {
      name: 'Order Flow',
      callDelta: data.callDeltaFlow,
      putDelta: data.putDeltaFlow,
      netDelta: data.netDeltaFlow,
      buyPressure: data.buyPressure,
      sellPressure: data.sellPressure
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Net Delta Flow</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value) => value.toFixed(2)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Bar dataKey="callDelta" fill="#3b82f6" name="Call Delta" />
            <Bar dataKey="putDelta" fill="#ef4444" name="Put Delta" />
            <Bar dataKey="netDelta" fill="#8b5cf6" name="Net Delta" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Buy vs Sell Pressure</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value) => `${value.toFixed(2)}%`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Bar dataKey="buyPressure" fill="#10b981" name="Buy Pressure %" />
            <Bar dataKey="sellPressure" fill="#f59e0b" name="Sell Pressure %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Net Flow</div>
          <div className="text-lg font-semibold text-blue-900">{data.netFlow.toFixed(0)}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Aggregate Delta</div>
          <div className="text-lg font-semibold text-purple-900">{data.netDeltaFlow.toFixed(4)}</div>
        </div>
      </div>
    </div>
  )
}
