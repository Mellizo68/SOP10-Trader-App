import React, { useMemo } from 'react'
import { HistoricalGreekPoint } from '../../hooks/useHistoricalGreeks'

interface HistoricalGreeksChartProps {
  data: HistoricalGreekPoint[]
  loading: boolean
  error: string | null
  symbol: string
  strike: number
  expiration: string
}

/**
 * Historical Greeks Chart Component
 * Displays Greeks (Delta, Gamma, Theta, Vega, IV) over time
 * Uses a simple line chart implementation with SVG
 */
export const HistoricalGreeksChart: React.FC<HistoricalGreeksChartProps> = ({
  data,
  loading,
  error,
  symbol,
  strike,
  expiration,
}) => {
  // Chart dimensions
  const width = 800
  const height = 400
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Calculate scales
  const scales = useMemo(() => {
    if (data.length === 0) {
      return { x: 1, y: 1, minDelta: 0, maxDelta: 1, minGamma: 0, maxGamma: 1 }
    }

    const deltas = data.map(d => d.delta)
    const gammas = data.map(d => d.gamma)

    const minDelta = Math.min(...deltas)
    const maxDelta = Math.max(...deltas)
    const minGamma = Math.min(...gammas)
    const maxGamma = Math.max(...gammas)

    const xScale = chartWidth / (data.length - 1 || 1)
    const yScale = chartHeight / Math.max(maxDelta - minDelta, maxGamma - minGamma, 1)

    return { x: xScale, y: yScale, minDelta, maxDelta, minGamma, maxGamma }
  }, [data])

  // Generate SVG path strings
  const paths = useMemo(() => {
    if (data.length === 0) return { delta: '', gamma: '', theta: '', vega: '' }

    // Delta path
    const deltaPath = data
      .map((d, i) => {
        const x = padding + i * scales.x
        const y = padding + chartHeight - (d.delta - scales.minDelta) * scales.y
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    // Gamma path
    const gammaPath = data
      .map((d, i) => {
        const x = padding + i * scales.x
        const y = padding + chartHeight - (d.gamma - scales.minGamma) * scales.y
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    // Theta path
    const thetaPath = data
      .map((d, i) => {
        const x = padding + i * scales.x
        // Scale theta to fit on chart
        const maxTheta = Math.max(...data.map(p => p.theta))
        const minTheta = Math.min(...data.map(p => p.theta))
        const range = maxTheta - minTheta || 1
        const y = padding + chartHeight - ((d.theta - minTheta) / range) * chartHeight
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    // Vega path
    const vegaPath = data
      .map((d, i) => {
        const x = padding + i * scales.x
        // Scale vega to fit on chart
        const maxVega = Math.max(...data.map(p => p.vega))
        const minVega = Math.min(...data.map(p => p.vega))
        const range = maxVega - minVega || 1
        const y = padding + chartHeight - ((d.vega - minVega) / range) * chartHeight
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    return { delta: deltaPath, gamma: gammaPath, theta: thetaPath, vega: vegaPath }
  }, [data, scales])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-semibold">Failed to load historical data</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (loading || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">
          {loading ? 'Loading historical Greeks...' : 'No data available for this contract'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="font-bold text-lg text-gray-900">
          Historical Greeks: {symbol} {strike} Call
        </h3>
        <p className="text-sm text-gray-600">
          Expiration: {expiration} | Data points: {data.length}
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="border border-gray-300 rounded"
        >
          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = padding + (chartHeight / 4) * i
            return (
              <line
                key={`grid-${i}`}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
            )
          })}

          {/* Axes */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#333" strokeWidth="2" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#333" strokeWidth="2" />

          {/* Delta line */}
          <path d={paths.delta} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />

          {/* Gamma line */}
          <path d={paths.gamma} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />

          {/* Theta line (dashed) */}
          <path
            d={paths.theta}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5,5"
          />

          {/* Vega line (dashed) */}
          <path
            d={paths.vega}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5,5"
          />

          {/* Y-axis label */}
          <text x={20} y={padding - 10} fontSize="12" textAnchor="middle" fill="#666">
            Greeks Value
          </text>

          {/* X-axis label */}
          <text x={width / 2} y={height - 20} fontSize="12" textAnchor="middle" fill="#666">
            Date
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500"></div>
          <span>Delta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-red-500"></div>
          <span>Gamma</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-amber-500" style={{ borderTop: '2px dashed rgb(245, 158, 11)' }}></div>
          <span>Theta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-purple-500" style={{ borderTop: '2px dashed rgb(139, 92, 246)' }}></div>
          <span>Vega</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-right">Delta</th>
              <th className="px-2 py-1 text-right">Gamma</th>
              <th className="px-2 py-1 text-right">Theta</th>
              <th className="px-2 py-1 text-right">Vega</th>
              <th className="px-2 py-1 text-right">IV</th>
              <th className="px-2 py-1 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-2 py-1 border-b border-gray-200">{row.date}</td>
                <td className="px-2 py-1 border-b border-gray-200 text-right">{row.delta.toFixed(3)}</td>
                <td className="px-2 py-1 border-b border-gray-200 text-right">{row.gamma.toFixed(4)}</td>
                <td className="px-2 py-1 border-b border-gray-200 text-right">{row.theta.toFixed(3)}</td>
                <td className="px-2 py-1 border-b border-gray-200 text-right">{row.vega.toFixed(3)}</td>
                <td className="px-2 py-1 border-b border-gray-200 text-right">{(row.iv * 100).toFixed(2)}%</td>
                <td className="px-2 py-1 border-b border-gray-200 text-right">${row.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HistoricalGreeksChart
