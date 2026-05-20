import React, { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface ExitTarget {
  takeProfit: number
  stopLoss: number
  maxGain: number
  maxLoss: number
  riskRewardRatio: number
  positionSize: number
}

const ExitCalculator: React.FC = () => {
  const [formData, setFormData] = useState({
    strategy: 'BULL_PUT_SPREAD',
    premiumReceived: 0,
    premiumPaid: 0,
    spreadWidth: 0,      // Para spreads
    entryPrice: 0,
    strikePrice: 0,
    maxLossPercentage: 0, // % máximo de pérdida deseado
    accountSize: 10000,   // Tamaño de cuenta (para position size)
  })

  const [result, setResult] = useState<ExitTarget | null>(null)

  const calculateTargets = () => {
    const {
      strategy,
      premiumReceived,
      premiumPaid,
      spreadWidth,
      entryPrice,
      maxLossPercentage,
      accountSize,
    } = formData

    let takeProfit = 0
    let stopLoss = 0
    let maxGain = 0
    let maxLoss = 0
    let riskRewardRatio = 0

    // CREDIT SPREADS (BULL_PUT_SPREAD, BEAR_CALL_SPREAD)
    if (strategy.includes('CREDIT') || strategy === 'BULL_PUT_SPREAD' || strategy === 'BEAR_CALL_SPREAD' || strategy === 'IRON_CONDOR') {
      maxGain = premiumReceived
      maxLoss = spreadWidth - premiumReceived
      takeProfit = premiumReceived * 0.5 // 50% de ganancia
      stopLoss = maxLoss * 1.2 // 120% de máxima pérdida
      riskRewardRatio = maxGain / Math.abs(maxLoss)
    }

    // DEBIT SPREADS (BULL_CALL_SPREAD, BEAR_PUT_SPREAD)
    else if (strategy.includes('DEBIT') || strategy === 'BULL_CALL_SPREAD' || strategy === 'BEAR_PUT_SPREAD') {
      maxGain = spreadWidth - premiumPaid
      maxLoss = premiumPaid
      takeProfit = premiumPaid + maxGain * 0.5 // 50% del máximo
      stopLoss = premiumPaid * 1.5 // 150% de costo
      riskRewardRatio = maxGain / maxLoss
    }

    // LONG CALL / LONG PUT (DIRECTIONAL)
    else if (strategy === 'LONG_CALL' || strategy === 'LONG_PUT') {
      maxGain = entryPrice * 3 // Objetivo 300% (teorético)
      maxLoss = premiumPaid
      takeProfit = premiumPaid * 2.5 // 250% de retorno
      stopLoss = premiumPaid * 0.5 // Stop en 50% de pérdida
      riskRewardRatio = maxGain / maxLoss
    }

    // STRADDLE / STRANGLE
    else if (strategy === 'STRADDLE' || strategy === 'STRANGLE') {
      maxGain = (premiumReceived || premiumPaid) * 2
      maxLoss = (premiumReceived || premiumPaid) * 1
      takeProfit = (premiumReceived || premiumPaid) * 0.4 // 40% de ganancia
      stopLoss = (premiumReceived || premiumPaid) * 1.5
      riskRewardRatio = maxGain / maxLoss
    }

    // Calcular posición size basado en máxima pérdida deseada
    const maxLossDesired = maxLossPercentage > 0 ? (accountSize * maxLossPercentage) / 100 : maxLoss
    const positionSize = Math.abs(maxLossDesired / maxLoss) || 1

    setResult({
      takeProfit: Math.round(takeProfit * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      maxGain: Math.round(maxGain * 100) / 100,
      maxLoss: Math.round(maxLoss * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      positionSize: Math.round(positionSize * 100) / 100,
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }))
  }

  const getStrategyType = () => {
    const s = formData.strategy
    if (s.includes('CREDIT') || s === 'BULL_PUT_SPREAD' || s === 'BEAR_CALL_SPREAD' || s === 'IRON_CONDOR') {
      return 'CREDIT'
    }
    if (s.includes('DEBIT') || s === 'BULL_CALL_SPREAD' || s === 'BEAR_PUT_SPREAD') {
      return 'DEBIT'
    }
    if (s === 'LONG_CALL' || s === 'LONG_PUT') return 'DIRECTIONAL'
    if (s === 'STRADDLE' || s === 'STRANGLE') return 'VOLATILITY'
    return 'OTHER'
  }

  const strategyType = getStrategyType()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-2xl">🎯</span> Calculador de Salidas SOP10
          </h1>
          <p className="text-gray-400">Calcula TP/SL automáticos basados en prima y estrategia</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Strategy Selection */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <label className="block text-sm text-gray-400 mb-3 font-bold">ESTRATEGIA</label>
              <select
                value={formData.strategy}
                onChange={(e) => setFormData((prev) => ({ ...prev, strategy: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white"
              >
                <optgroup label="CREDIT SPREADS">
                  <option value="BULL_PUT_SPREAD">BULL_PUT_SPREAD</option>
                  <option value="BEAR_CALL_SPREAD">BEAR_CALL_SPREAD</option>
                  <option value="IRON_CONDOR">IRON_CONDOR</option>
                </optgroup>
                <optgroup label="DEBIT SPREADS">
                  <option value="BULL_CALL_SPREAD">BULL_CALL_SPREAD</option>
                  <option value="BEAR_PUT_SPREAD">BEAR_PUT_SPREAD</option>
                </optgroup>
                <optgroup label="DIRECTIONAL">
                  <option value="LONG_CALL">LONG_CALL</option>
                  <option value="LONG_PUT">LONG_PUT</option>
                </optgroup>
                <optgroup label="VOLATILITY">
                  <option value="STRADDLE">STRADDLE</option>
                  <option value="STRANGLE">STRANGLE</option>
                </optgroup>
              </select>
            </div>

            {/* Inputs based on strategy type */}
            <div className="bg-slate-800 p-6 rounded-lg space-y-4">
              <h2 className="text-lg font-bold text-cyan-400 mb-4">
                {strategyType === 'CREDIT' && '💰 CREDIT SPREAD - Recibir Prima'}
                {strategyType === 'DEBIT' && '💸 DEBIT SPREAD - Pagar Prima'}
                {strategyType === 'DIRECTIONAL' && '📈 DIRECTIONAL - Movimiento Claro'}
                {strategyType === 'VOLATILITY' && '⚡ VOLATILITY - Movimiento Incierto'}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Credit/Debit Prima */}
                {(strategyType === 'CREDIT') && (
                  <InputField
                    label="Prima Recibida ($)"
                    value={formData.premiumReceived}
                    onChange={(val) => handleInputChange('premiumReceived', val)}
                    placeholder="200"
                  />
                )}

                {(strategyType === 'DEBIT' || strategyType === 'DIRECTIONAL') && (
                  <InputField
                    label="Prima Pagada ($)"
                    value={formData.premiumPaid}
                    onChange={(val) => handleInputChange('premiumPaid', val)}
                    placeholder="150"
                  />
                )}

                {(strategyType === 'VOLATILITY') && (
                  <>
                    <InputField
                      label="Prima Recibida ($)"
                      value={formData.premiumReceived}
                      onChange={(val) => handleInputChange('premiumReceived', val)}
                      placeholder="300"
                    />
                    <InputField
                      label="Prima Pagada ($)"
                      value={formData.premiumPaid}
                      onChange={(val) => handleInputChange('premiumPaid', val)}
                      placeholder="100"
                    />
                  </>
                )}

                {/* Spread Width (para spreads) */}
                {(strategyType === 'CREDIT' || strategyType === 'DEBIT') && (
                  <InputField
                    label="Ancho del Spread ($)"
                    value={formData.spreadWidth}
                    onChange={(val) => handleInputChange('spreadWidth', val)}
                    placeholder="500 (5.00 por contrato)"
                  />
                )}

                {/* Entry Price */}
                <InputField
                  label="Precio de Entrada"
                  value={formData.entryPrice}
                  onChange={(val) => handleInputChange('entryPrice', val)}
                  placeholder="104.50"
                />

                {/* Strike Price */}
                <InputField
                  label="Strike Price"
                  value={formData.strikePrice}
                  onChange={(val) => handleInputChange('strikePrice', val)}
                  placeholder="100.00"
                />

                {/* Max Loss % */}
                <InputField
                  label="Máx Pérdida Deseada (%)"
                  value={formData.maxLossPercentage}
                  onChange={(val) => handleInputChange('maxLossPercentage', val)}
                  placeholder="2 (2% de cuenta)"
                />

                {/* Account Size */}
                <InputField
                  label="Tamaño de Cuenta ($)"
                  value={formData.accountSize}
                  onChange={(val) => handleInputChange('accountSize', val)}
                  placeholder="10000"
                />
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateTargets}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all text-lg"
            >
              🧮 CALCULAR SALIDAS
            </button>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {result && (
              <>
                {/* Main Results */}
                <div className="bg-slate-800 p-6 rounded-lg">
                  <p className="text-gray-400 mb-3 font-bold text-sm">TARGETS</p>

                  <div className="space-y-3">
                    <div className="bg-green-900 bg-opacity-40 border border-green-600 p-3 rounded">
                      <p className="text-green-400 text-sm">Take Profit</p>
                      <p className="text-2xl font-bold text-green-300">${result.takeProfit.toFixed(2)}</p>
                    </div>

                    <div className="bg-red-900 bg-opacity-40 border border-red-600 p-3 rounded">
                      <p className="text-red-400 text-sm">Stop Loss</p>
                      <p className="text-2xl font-bold text-red-300">${result.stopLoss.toFixed(2)}</p>
                    </div>

                    <div className="bg-blue-900 bg-opacity-40 border border-blue-600 p-3 rounded">
                      <p className="text-blue-400 text-sm">R/R Ratio</p>
                      <p className="text-2xl font-bold text-blue-300">1:{result.riskRewardRatio.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Risk/Reward Details */}
                <div className="bg-slate-800 p-6 rounded-lg">
                  <p className="text-gray-400 mb-3 font-bold text-sm">RIESGO/GANANCIA</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Máx Ganancia:</span>
                      <span className="font-bold text-green-400">${result.maxGain.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Máx Pérdida:</span>
                      <span className="font-bold text-red-400">${result.maxLoss.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contratos:</span>
                      <span className="font-bold text-cyan-400">{result.positionSize.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-slate-800 p-6 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    {result.riskRewardRatio >= 1.5 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <p className="font-bold">
                      {result.riskRewardRatio >= 1.5
                        ? 'R/R EXCELENTE ✅'
                        : result.riskRewardRatio >= 1.2
                        ? 'R/R BUENA ⚠️'
                        : 'R/R POBRE ❌'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {result.riskRewardRatio >= 1.5
                      ? 'Relación riesgo/recompensa favorable. Recomendado.'
                      : result.riskRewardRatio >= 1.2
                      ? 'Relación aceptable. Considera ajustar.'
                      : 'Relación muy pobre. Rechaza esta operación.'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Input Component
const InputField: React.FC<{
  label: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
      onBlur={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
      placeholder={placeholder}
      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500"
    />
  </div>
)

export default ExitCalculator
