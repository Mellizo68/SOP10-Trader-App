import React, { useState, useEffect } from 'react'
import { SetupValidation, ValidationResult } from '../types'
import { SetupValidatorService } from '../services/setupValidator'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface SetupValidatorProps {
  initialData?: SetupValidation
  onValidationResult?: (result: ValidationResult) => void
  onCreateTradeEntry?: () => void
}

const SetupValidator: React.FC<SetupValidatorProps> = ({ initialData, onValidationResult, onCreateTradeEntry }) => {
  const [formData, setFormData] = useState<SetupValidation>({
    gexData: {
      callWall1: 0,
      callWall2: 0,
      callWall3: 0,
      putWall1: 0,
      putWall2: 0,
      putWall3: 0,
      netGEX: 0,
      gammaFlip: false,
      gammaPositive: false
    },
    priceAction: {
      currentPrice: 0,
      vwapMonth: 0,
      avwapHigh: 0,
      avwapLow: 0,
      avwapMonth: 0,
      pocMonth: 0,
      apvpHigh: 0,
      apvpLow: 0,
      ema21: 0,
      sma200: 0
    },
    volatilityCVD: {
      ivPercent: 0,
      cvdValue: 0,
      cvdEMA: 0,
      cvdDelta: 0,
      cvdDivergence: 'none',
      cvdDivergenceStrength: 'weak',
      institutionalVolume: false
    },
    options: {
      symbol: 'SPY',
      strategy: 'BULL_PUT_SPREAD',
      strikePrice: 0,
      delta: 0,
      gamma: 0,
      vega: 0,
      theta: 0,
      daysToExpiration: 0,
      optionType: 'put'
    },
    timestamp: new Date(),
    screenshots: {},
    comments: ''
  })

  const [result, setResult] = useState<ValidationResult | null>(null)
  const [activeTab, setActiveTab] = useState<'gex' | 'price' | 'vol' | 'options'>('gex')

  // Cargar datos iniciales si se proporcionan
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      // Auto-analizar si hay datos completos
      setTimeout(() => {
        const validation = SetupValidatorService.validateSetup(initialData)
        setResult(validation)
      }, 100)
    }
  }, [initialData])

  const handleAnalyze = () => {
    const validation = SetupValidatorService.validateSetup(formData)
    setResult(validation)
    if (onValidationResult) {
      onValidationResult(validation)
    }
  }

  const handleInputChange = (section: keyof SetupValidation, field: string, value: any) => {
    setFormData(prev => {
      const currentSection = prev[section] as any
      return {
        ...prev,
        [section]: {
          ...currentSection,
          [field]: value
        }
      }
    })
  }

  const ConfluenceScoreBadge = ({ score }: { score: number }) => {
    const getColor = () => {
      if (score >= 80) return 'bg-green-500'
      if (score >= 65) return 'bg-yellow-500'
      return 'bg-red-500'
    }

    return (
      <div className={`${getColor()} text-white px-6 py-3 rounded-lg font-bold text-2xl`}>
        {score}/100 ✓
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-2xl">🎯</span> SOP10 Setup Validator
          </h1>
          <p className="text-gray-400">Validación profesional de setups de opciones</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
              {['gex', 'price', 'vol', 'options'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 px-4 py-2 rounded transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* GEX Tab */}
            {activeTab === 'gex' && (
              <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-bold text-cyan-400">🔧 GEX & GAMMA</h2>

                {/* Call Walls */}
                <div>
                  <p className="text-sm text-green-400 font-bold mb-2">📈 CALL WALLS (Resistencia)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <InputField
                      label="C1"
                      value={formData.gexData.callWall1}
                      onChange={(val) => handleInputChange('gexData', 'callWall1', val)}
                      placeholder="112.50"
                    />
                    <InputField
                      label="C2"
                      value={formData.gexData.callWall2}
                      onChange={(val) => handleInputChange('gexData', 'callWall2', val)}
                      placeholder="115.00"
                    />
                    <InputField
                      label="C3"
                      value={formData.gexData.callWall3}
                      onChange={(val) => handleInputChange('gexData', 'callWall3', val)}
                      placeholder="117.50"
                    />
                  </div>
                </div>

                {/* Put Walls */}
                <div>
                  <p className="text-sm text-red-400 font-bold mb-2">📉 PUT WALLS (Soporte)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <InputField
                      label="P1"
                      value={formData.gexData.putWall1}
                      onChange={(val) => handleInputChange('gexData', 'putWall1', val)}
                      placeholder="98.50"
                    />
                    <InputField
                      label="P2"
                      value={formData.gexData.putWall2}
                      onChange={(val) => handleInputChange('gexData', 'putWall2', val)}
                      placeholder="96.00"
                    />
                    <InputField
                      label="P3"
                      value={formData.gexData.putWall3}
                      onChange={(val) => handleInputChange('gexData', 'putWall3', val)}
                      placeholder="93.50"
                    />
                  </div>
                </div>

                {/* Gamma Info */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-600">
                  <InputField
                    label="Net GEX (M)"
                    value={formData.gexData.netGEX}
                    onChange={(val) => handleInputChange('gexData', 'netGEX', val)}
                    placeholder="577.6"
                  />
                  <CheckboxField
                    label="Gamma Positivo"
                    checked={formData.gexData.gammaPositive}
                    onChange={(val) => handleInputChange('gexData', 'gammaPositive', val)}
                  />
                </div>
              </div>
            )}

            {/* Price Action Tab */}
            {activeTab === 'price' && (
              <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-bold text-green-400">💹 PRICE ACTION</h2>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Current Price"
                    value={formData.priceAction.currentPrice}
                    onChange={(val) => handleInputChange('priceAction', 'currentPrice', val)}
                  />
                  <InputField
                    label="VWAP (Month)"
                    value={formData.priceAction.vwapMonth}
                    onChange={(val) => handleInputChange('priceAction', 'vwapMonth', val)}
                  />
                  <InputField
                    label="AVWAP High"
                    value={formData.priceAction.avwapHigh}
                    onChange={(val) => handleInputChange('priceAction', 'avwapHigh', val)}
                  />
                  <InputField
                    label="AVWAP Low"
                    value={formData.priceAction.avwapLow}
                    onChange={(val) => handleInputChange('priceAction', 'avwapLow', val)}
                  />
                  <InputField
                    label="AVWAP Month"
                    value={formData.priceAction.avwapMonth}
                    onChange={(val) => handleInputChange('priceAction', 'avwapMonth', val)}
                    placeholder="Tendencia mensual"
                  />
                  <InputField
                    label="POC Month"
                    value={formData.priceAction.pocMonth}
                    onChange={(val) => handleInputChange('priceAction', 'pocMonth', val)}
                    placeholder="Máximo volumen"
                  />
                  <InputField
                    label="APVP High"
                    value={formData.priceAction.apvpHigh}
                    onChange={(val) => handleInputChange('priceAction', 'apvpHigh', val)}
                  />
                  <InputField
                    label="APVP Low"
                    value={formData.priceAction.apvpLow}
                    onChange={(val) => handleInputChange('priceAction', 'apvpLow', val)}
                  />
                  <InputField
                    label="EMA21"
                    value={formData.priceAction.ema21}
                    onChange={(val) => handleInputChange('priceAction', 'ema21', val)}
                  />
                  <InputField
                    label="SMA200"
                    value={formData.priceAction.sma200}
                    onChange={(val) => handleInputChange('priceAction', 'sma200', val)}
                  />
                </div>
              </div>
            )}

            {/* Volatility & CVD Tab */}
            {activeTab === 'vol' && (
              <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-bold text-yellow-400">📈 VOLATILITY & CVD</h2>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="IV Percent (%)"
                    value={formData.volatilityCVD.ivPercent}
                    onChange={(val) => handleInputChange('volatilityCVD', 'ivPercent', val)}
                  />
                  <InputField
                    label="CVD Value"
                    value={formData.volatilityCVD.cvdValue}
                    onChange={(val) => handleInputChange('volatilityCVD', 'cvdValue', val)}
                  />
                  <InputField
                    label="CVD EMA"
                    value={formData.volatilityCVD.cvdEMA}
                    onChange={(val) => handleInputChange('volatilityCVD', 'cvdEMA', val)}
                  />
                  <InputField
                    label="CVD Delta (velocidad)"
                    value={formData.volatilityCVD.cvdDelta}
                    onChange={(val) => handleInputChange('volatilityCVD', 'cvdDelta', val)}
                    placeholder="Cambio en CVD"
                  />
                  <SelectField
                    label="CVD Divergence"
                    value={formData.volatilityCVD.cvdDivergence}
                    options={['none', 'bullish', 'bearish']}
                    onChange={(val) => handleInputChange('volatilityCVD', 'cvdDivergence', val)}
                  />
                  <SelectField
                    label="Divergence Strength"
                    value={formData.volatilityCVD.cvdDivergenceStrength}
                    options={['weak', 'medium', 'strong']}
                    onChange={(val) => handleInputChange('volatilityCVD', 'cvdDivergenceStrength', val)}
                  />
                  <CheckboxField
                    label="Institutional Volume"
                    checked={formData.volatilityCVD.institutionalVolume}
                    onChange={(val) => handleInputChange('volatilityCVD', 'institutionalVolume', val)}
                  />
                </div>

                {/* Z-Score & Institutional Activity Section */}
                <div className="pt-4 border-t border-slate-600">
                  <h3 className="text-lg font-bold text-orange-400 mb-4">⚡ INSTITUTIONAL ACTIVITY (Z-Score)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Z-Score (CVD)"
                      value={formData.volatilityCVD.zScore || 0}
                      onChange={(val) => handleInputChange('volatilityCVD', 'zScore', val)}
                      placeholder="ej: 2.34 (>2 = fuerte compra, <-2 = fuerte venta)"
                    />
                    <InputField
                      label="Z-Vol (Volume)"
                      value={formData.volatilityCVD.zVol || 0}
                      onChange={(val) => handleInputChange('volatilityCVD', 'zVol', val)}
                      placeholder="ej: 1.89"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    💡 Z-Score {'>'} +2.0 = Actividad fuerte COMPRA (+15 pts) | Z-Score {'<'} -2.0 = Actividad fuerte VENTA (-10 pts)
                  </p>
                </div>
              </div>
            )}

            {/* Options Tab */}
            {activeTab === 'options' && (
              <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-bold text-purple-400">⚙️ OPTIONS</h2>
                <div className="grid grid-cols-2 gap-4">
                  <TextInputField
                    label="Symbol"
                    value={formData.options.symbol}
                    onChange={(val) => handleInputChange('options', 'symbol', val)}
                  />
                  <SelectField
                    label="Strategy"
                    value={formData.options.strategy}
                    options={['BULL_PUT_SPREAD', 'BEAR_CALL_SPREAD', 'BULL_CALL_SPREAD', 'BEAR_PUT_SPREAD', 'IRON_CONDOR', 'IRON_BUTTERFLY', 'LONG_CALL', 'LONG_PUT', 'STRADDLE', 'STRANGLE', 'COLLAR', 'COVERED_CALL', 'PROTECTIVE_PUT']}
                    onChange={(val) => handleInputChange('options', 'strategy', val)}
                  />
                  <InputField
                    label="Strike Price"
                    value={formData.options.strikePrice}
                    onChange={(val) => handleInputChange('options', 'strikePrice', val)}
                  />
                  <InputField
                    label="Delta"
                    value={formData.options.delta}
                    onChange={(val) => handleInputChange('options', 'delta', val)}
                  />
                  <InputField
                    label="DTE (Days)"
                    value={formData.options.daysToExpiration}
                    onChange={(val) => handleInputChange('options', 'daysToExpiration', val)}
                  />
                  <SelectField
                    label="Option Type"
                    value={formData.options.optionType}
                    options={['call', 'put']}
                    onChange={(val) => handleInputChange('options', 'optionType', val as any)}
                  />
                </div>
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all text-lg"
            >
              🔍 ANALIZAR SETUP
            </button>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {result && (
              <>
                {/* Confluence Score */}
                <div className="bg-slate-800 p-6 rounded-lg text-center">
                  <p className="text-gray-400 mb-3">CONFLUENCE SCORE</p>
                  <ConfluenceScoreBadge score={result.confluenceScore} />
                  <p className={`mt-3 font-bold ${result.isValidSetup ? 'text-green-400' : 'text-red-400'}`}>
                    {result.isValidSetup ? '✅ SETUP VÁLIDO' : '❌ SETUP INVÁLIDO'}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="bg-slate-800 p-6 rounded-lg">
                  <p className="text-gray-400 mb-3 font-bold">RECOMENDACIÓN</p>
                  <p className="text-2xl font-bold text-cyan-400">{result.recommendation}</p>

                  {/* Alternatives */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <p className="text-gray-400 mb-2 text-sm font-bold">ALTERNATIVAS (por compatibilidad):</p>
                      <div className="space-y-2">
                        {result.alternatives.map((alt, i) => {
                          const compatibility = alt.trendCompatibility || 0
                          const getCompatibilityColor = () => {
                            if (compatibility >= 90) return 'text-green-400'
                            if (compatibility >= 70) return 'text-lime-400'
                            if (compatibility >= 50) return 'text-yellow-400'
                            return 'text-red-400'
                          }

                          return (
                            <div key={i} className="text-xs bg-slate-700 p-2 rounded border-l-4 border-slate-500">
                              <div className="flex justify-between items-start">
                                <span className="text-amber-400 font-bold">{alt.strategy}</span>
                                <span className={`font-bold ${getCompatibilityColor()}`}>{compatibility}%</span>
                              </div>
                              <p className="text-gray-300 mt-1">{alt.reason}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Entry Target:</span>
                      <span className="font-bold">${result.targetEntry.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Take Profit:</span>
                      <span className="font-bold text-green-400">${result.targetTP.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stop Loss:</span>
                      <span className="font-bold text-red-400">${result.targetSL.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Checks */}
                <div className="bg-slate-800 p-6 rounded-lg">
                  <p className="text-gray-400 mb-3 font-bold">VALIDACIÓN</p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(result.checks).map(([check, passed]) => (
                      <div key={check} className="flex items-center gap-2">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span>{check.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 p-4 rounded-lg">
                    <p className="text-yellow-400 font-bold mb-2">⚠️ ADVERTENCIAS</p>
                    <ul className="text-sm space-y-1">
                      {result.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {result.notes.length > 0 && (
                  <div className="bg-blue-900 bg-opacity-30 border border-blue-700 p-4 rounded-lg">
                    <p className="text-blue-400 font-bold mb-2">📝 NOTAS</p>
                    <ul className="text-sm space-y-1">
                      {result.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Create Trade Entry Button */}
                <button
                  onClick={onCreateTradeEntry}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
                >
                  📓 Crear Trade Entry
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Input Components
const InputField: React.FC<{
  label: string
  value: number | string
  onChange: (value: number | string) => void
  placeholder?: string
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
      onBlur={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500"
    />
  </div>
)

const TextInputField: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500"
    />
  </div>
)

const CheckboxField: React.FC<{
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}> = ({ label, checked, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4"
    />
    <label className="text-sm text-gray-400">{label}</label>
  </div>
)

const SelectField: React.FC<{
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}> = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
)

export default SetupValidator
