import React, { useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import { ImageExtractorService, ExtractedData } from '../services/imageExtractor'
import { SetupValidation } from '../types'

interface ImageExtractorProps {
  onExtractComplete?: (data: SetupValidation) => void
}

const ImageExtractor: React.FC<ImageExtractorProps> = ({ onExtractComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida')
      return
    }

    setSelectedFile(file)
    setError(null)
    setVerified(false)

    // Generar preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleExtract = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona una imagen')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await ImageExtractorService.extractFromImage(selectedFile)
      setExtractedData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido en extracción')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = () => {
    setVerified(true)
  }

  const handleConfirm = () => {
    if (!extractedData || !onExtractComplete) return

    // Construir objeto SetupValidation
    const setupData: SetupValidation = {
      gexData: {
        callWall1: extractedData.gex?.callWall1 || 0,
        callWall2: extractedData.gex?.callWall2 || 0,
        callWall3: extractedData.gex?.callWall3 || 0,
        putWall1: extractedData.gex?.putWall1 || 0,
        putWall2: extractedData.gex?.putWall2 || 0,
        putWall3: extractedData.gex?.putWall3 || 0,
        netGEX: extractedData.gex?.netGEX || 0,
        gammaFlip: false,
        gammaPositive: false,
      },
      priceAction: {
        currentPrice: extractedData.priceAction?.currentPrice || 0,
        vwapMonth: extractedData.priceAction?.vwapMonth || 0,
        avwapHigh: extractedData.priceAction?.avwapHigh || 0,
        avwapLow: extractedData.priceAction?.avwapLow || 0,
        avwapMonth: extractedData.priceAction?.avwapMonth || 0,
        pocMonth: extractedData.priceAction?.pocMonth || 0,
        apvpHigh: extractedData.priceAction?.apvpHigh || 0,
        apvpLow: extractedData.priceAction?.apvpLow || 0,
        ema21: extractedData.priceAction?.ema21 || 0,
        sma200: extractedData.priceAction?.sma200 || 0,
      },
      volatilityCVD: {
        ivPercent: extractedData.volatilityCVD?.ivPercent || 0,
        cvdValue: extractedData.volatilityCVD?.cvdValue || 0,
        cvdEMA: extractedData.volatilityCVD?.cvdEMA || 0,
        cvdDelta: extractedData.volatilityCVD?.cvdDelta || 0,
        cvdDivergence: 'none',
        cvdDivergenceStrength: 'weak',
        institutionalVolume: false,
      },
      options: {
        symbol: '',
        strategy: 'BULL_PUT_SPREAD',
        strikePrice: 0,
        delta: 0,
        gamma: 0,
        vega: 0,
        theta: 0,
        daysToExpiration: 0,
        optionType: 'call',
      },
      timestamp: new Date(),
      screenshots: {
        gexScreenshot: preview || undefined,
      },
      comments: `Extraído automáticamente de imagen con ${extractedData.confidence}% confianza`,
    }

    onExtractComplete(setupData)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-2xl">📸</span> Extractor de Imágenes
          </h1>
          <p className="text-gray-400">Sube capturas de TradingView o TanukiTrade y extrae datos automáticamente</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <div
              className="bg-slate-800 border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-lg p-12 text-center cursor-pointer transition-colors"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-12 h-12 text-cyan-400" />
                <div>
                  <p className="text-lg font-bold">Sube tu imagen de GEX o TradingView</p>
                  <p className="text-sm text-gray-400 mt-2">PNG, JPG o WebP • Máx 20MB</p>
                </div>
              </div>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-slate-800 p-6 rounded-lg">
                <p className="text-gray-400 mb-3 font-bold text-sm">PREVIEW</p>
                <img src={preview} alt="preview" className="max-h-96 mx-auto rounded border border-slate-700" />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900 bg-opacity-40 border border-red-600 p-4 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Extract Button */}
            {selectedFile && !extractedData && (
              <button
                onClick={handleExtract}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all text-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analizando imagen...
                  </>
                ) : (
                  <>
                    <span>🚀</span> EXTRAER DATOS
                  </>
                )}
              </button>
            )}

            {/* Reset Button */}
            {extractedData && (
              <button
                onClick={() => {
                  setSelectedFile(null)
                  setPreview(null)
                  setExtractedData(null)
                  setVerified(false)
                  setError(null)
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Cargar otra imagen
              </button>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Confidence */}
            {extractedData && (
              <>
                <div className="bg-slate-800 p-6 rounded-lg">
                  <p className="text-gray-400 mb-3 font-bold text-sm">CONFIANZA DE EXTRACCIÓN</p>
                  <div className="relative h-12 bg-slate-700 rounded flex items-center justify-center overflow-hidden">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600"
                      style={{ width: `${extractedData.confidence}%` }}
                    />
                    <p className="relative text-lg font-bold">{extractedData.confidence}%</p>
                  </div>
                </div>

                {/* Detected Type */}
                <div className="bg-slate-800 p-6 rounded-lg">
                  <p className="text-gray-400 mb-3 font-bold text-sm">TIPO DETECTADO</p>
                  <div className="flex items-center gap-3">
                    {extractedData.confidence >= 70 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <p className="text-lg font-bold capitalize">{extractedData.detectedType.replace('_', ' ')}</p>
                  </div>
                </div>

                {/* Extracted Numbers */}
                <div className="bg-slate-800 p-6 rounded-lg max-h-96 overflow-y-auto">
                  <p className="text-gray-400 mb-3 font-bold text-sm">DATOS EXTRAÍDOS ({extractedData.extractedNumbers.length})</p>
                  <div className="space-y-2 text-sm">
                    {extractedData.extractedNumbers.length > 0 ? (
                      extractedData.extractedNumbers.map((item, idx) => (
                        <div key={idx} className="flex justify-between p-2 bg-slate-700 rounded">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="font-bold text-cyan-300">
                            {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No se extrajeron datos</p>
                    )}
                  </div>
                </div>

                {/* NET GAMMA & DELTA Summary (TanukiTrade) */}
                {(extractedData.netGamma || extractedData.netDelta || extractedData.gammaStatus) && (
                  <div className="bg-slate-800 p-4 rounded-lg border border-green-600 border-opacity-50">
                    <p className="text-green-400 font-bold text-sm mb-2">⚡ NET EXPOSURE</p>
                    <div className="space-y-1 text-xs">
                      {extractedData.netGamma && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">NET GAMMA:</span>
                          <span className="text-green-300 font-bold">{extractedData.netGamma}</span>
                        </div>
                      )}
                      {extractedData.netDelta && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">NET DELTA:</span>
                          <span className="text-green-300 font-bold">{extractedData.netDelta}</span>
                        </div>
                      )}
                      {extractedData.gammaStatus && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">GAMMA:</span>
                          <span className="text-green-300 font-bold">{extractedData.gammaStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* GEX Data Summary */}
                {extractedData.gex && Object.keys(extractedData.gex).length > 0 && (
                  <div className="bg-slate-800 p-4 rounded-lg border border-cyan-600 border-opacity-50">
                    <p className="text-cyan-400 font-bold text-sm mb-2">📊 GEX LEVELS</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {extractedData.gex.callWall1 && (
                        <div>
                          <span className="text-gray-400">C1:</span>
                          <span className="ml-2 text-cyan-300">${extractedData.gex.callWall1.toFixed(2)}</span>
                        </div>
                      )}
                      {extractedData.gex.putWall1 && (
                        <div>
                          <span className="text-gray-400">P1:</span>
                          <span className="ml-2 text-cyan-300">${extractedData.gex.putWall1.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expiry Chain Data (TanukiTrade Options Matrix) */}
                {extractedData.expiryChainData && extractedData.expiryChainData.length > 0 && (
                  <div className="bg-slate-800 p-4 rounded-lg border border-purple-600 border-opacity-50 max-h-48 overflow-y-auto">
                    <p className="text-purple-400 font-bold text-sm mb-2">📋 EXPIRY CHAIN ({extractedData.expiryChainData.length})</p>
                    <div className="space-y-2 text-xs">
                      {extractedData.expiryChainData.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="bg-slate-700 p-2 rounded">
                          <p className="text-purple-300 font-bold">{item.expiry}</p>
                          <div className="grid grid-cols-2 gap-1 text-gray-400 mt-1">
                            {Object.entries(item.data)
                              .slice(0, 6)
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span>{key.toUpperCase()}:</span>
                                  <span className="text-cyan-300">{String(value).substring(0, 15)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                      {extractedData.expiryChainData.length > 5 && (
                        <p className="text-gray-500 text-center">+{extractedData.expiryChainData.length - 5} más...</p>
                      )}
                    </div>
                  </div>
                )}

                {/* CVD & Volatility Metrics (ToS Z-Score) */}
                {(extractedData.volatilityCVD?.cvdValue !== undefined || extractedData.volatilityCVD?.zScore !== undefined) && (
                  <div className="bg-slate-800 p-4 rounded-lg border border-orange-600 border-opacity-50">
                    <p className="text-orange-400 font-bold text-sm mb-3">📊 CVD & VOLATILITY METRICS</p>
                    <div className="space-y-2 text-xs">
                      {extractedData.volatilityCVD?.cvdValue !== undefined && (
                        <div className="flex justify-between p-2 bg-slate-700 rounded">
                          <span className="text-gray-400">CVD VALUE:</span>
                          <span className="text-orange-300 font-bold">{extractedData.volatilityCVD.cvdValue.toFixed(0)}</span>
                        </div>
                      )}
                      {extractedData.volatilityCVD?.cvdEMA !== undefined && (
                        <div className="flex justify-between p-2 bg-slate-700 rounded">
                          <span className="text-gray-400">CVD EMA:</span>
                          <span className="text-orange-300 font-bold">{extractedData.volatilityCVD.cvdEMA.toFixed(0)}</span>
                        </div>
                      )}
                      {extractedData.volatilityCVD?.ivPercent !== undefined && (
                        <div className="flex justify-between p-2 bg-slate-700 rounded">
                          <span className="text-gray-400">IV %:</span>
                          <span className="text-orange-300 font-bold">{extractedData.volatilityCVD.ivPercent.toFixed(2)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Z-Score & Institutional Activity */}
                    {(extractedData.volatilityCVD?.zScore !== undefined || extractedData.volatilityCVD?.zVol !== undefined) && (
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <p className="text-yellow-400 font-bold text-xs mb-2">⚡ INSTITUTIONAL ACTIVITY</p>
                        <div className="space-y-2 text-xs">
                          {extractedData.volatilityCVD?.zScore !== undefined && (
                            <div className="flex justify-between p-2 bg-slate-700 rounded">
                              <span className="text-gray-400">Z-SCORE:</span>
                              <span className={`font-bold ${
                                extractedData.volatilityCVD.zScore > 2 ? 'text-green-400' :
                                extractedData.volatilityCVD.zScore < -2 ? 'text-red-400' :
                                'text-yellow-400'
                              }`}>
                                {extractedData.volatilityCVD.zScore.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {extractedData.volatilityCVD?.zVol !== undefined && (
                            <div className="flex justify-between p-2 bg-slate-700 rounded">
                              <span className="text-gray-400">Z-VOL:</span>
                              <span className="text-yellow-300 font-bold">{extractedData.volatilityCVD.zVol.toFixed(2)}</span>
                            </div>
                          )}
                          {extractedData.volatilityCVD?.institutionalActivityStatus && (
                            <div className="flex justify-between p-2 bg-slate-700 rounded">
                              <span className="text-gray-400">STATUS:</span>
                              <span className={`font-bold ${
                                extractedData.volatilityCVD.institutionalActivityStatus === 'strong_buy' ? 'text-green-400' :
                                extractedData.volatilityCVD.institutionalActivityStatus === 'strong_sell' ? 'text-red-400' :
                                'text-gray-300'
                              }`}>
                                {extractedData.volatilityCVD.institutionalActivityStatus.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {!verified ? (
                  <button
                    onClick={handleVerify}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-5 h-5" />
                    Verificar Datos
                  </button>
                ) : (
                  <button
                    onClick={handleConfirm}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Cargar en Validador
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageExtractor
