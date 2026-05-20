import { GEXData, PriceActionData, VolatilityCVDData } from '../types'

export interface ExtractedData {
  gex?: Partial<GEXData>
  priceAction?: Partial<PriceActionData>
  volatilityCVD?: Partial<VolatilityCVDData>
  confidence: number
  detectedType: 'gex' | 'price_action' | 'mixed' | 'unknown'
  rawText: string
  extractedNumbers: { label: string; value: string | number }[]
  expiryChainData?: Array<{
    expiry: string
    data: { [key: string]: string | number }
  }>
  netGamma?: string | number
  netDelta?: string | number
  gammaStatus?: string
}

export class ImageExtractorService {
  /**
   * Extrae datos de trading de una imagen usando Claude Vision API
   */
  static async extractFromImage(imageFile: File): Promise<ExtractedData> {
    try {
      // Validar API key
      const apiKey = (import.meta as any).env.VITE_ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error(
          'No se configuró la API key de Anthropic. Por favor, agrega VITE_ANTHROPIC_API_KEY a tu archivo .env.local'
        )
      }

      // Convertir archivo a base64
      const base64Image = await this.fileToBase64(imageFile)

      // Determinar tipo MIME
      const mimeType = imageFile.type || 'image/png'

      // Crear prompt específico para extracción de datos trading
      const extractionPrompt = this.getExtractionPrompt()

      // Llamar a Claude Vision API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: extractionPrompt,
                },
              ],
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData?.error?.message || `API Error: ${response.status}`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      const extractedText = result.content[0]?.text || ''

      // Parsear la respuesta
      return this.parseExtractedData(extractedText, imageFile.name)
    } catch (error) {
      console.error('Error en extracción de imagen:', error)
      throw new Error(`Falló la extracción: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Convierte un archivo a base64
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Genera el prompt para extracción de datos
   */
  private static getExtractionPrompt(): string {
    return `Eres un experto analizando gráficos de trading de TradingView y TanukiTrade.

Analiza esta imagen y extrae TODOS los datos numéricos visibles.

=== PARA IMÁGENES DE TRADINGVIEW (Price Action) ===
Busca estos indicadores (si están visibles):
- PRECIO ACTUAL
- VWAP (Volume Weighted Average Price)
- AVWAP (Anchored VWAP) - valores alto, bajo, mensual
- POC (Point of Control) - Mensual
- APVP (Volume Profile) - valores alto, bajo
- EMA 21 (Media Móvil Exponencial 21)
- SMA 200 (Media Móvil Simple 200)

=== PARA IMÁGENES DE TANUKITRADE - SUMMARY CARD (Gráfica 2) ===
Busca estos valores GRANDES/DESTACADOS:
- NET GAMMA (número grande, ejemplo: +124.25M)
- NET DELTA (número grande, ejemplo: +3.16B)
- GAMMA PROFILE (texto: "Positive Gamma" o "Negative Gamma")
- CHANGE 1D (cambio en 1 día, números con ↓)
- C1 CALL WALL (nivel de resistencia)
- P1 PUT WALL (nivel de soporte)
- HVL o cTrans (High Volatility Level o Call Transition)
- GAMMA STATUS (Above/Below/At HVL)

=== PARA IMÁGENES DE TANUKITRADE - OPTIONS CHAIN MATRIX (Gráfica 3) ===
Busca esta TABLA/MATRIZ con columnas y filas:
Columnas que contiene:
- EXPIRY (fecha de expiración - 05/22, 05/26, 05/29, 06/12, etc.)
- IVX (volatilidad implícita)
- REM (Remaining Days?)
- ASD (?)
- C/P SKEW (skew de calls vs puts)
- PROFILE (GREEN/RED indicator)
- NETGEX (Net GEX para esa expiry)
- AGEX (Aggregated GEX?)
- DEX (Delta Exposure)
- ADEX (Aggregated Delta Exposure)
- P1 (Put Wall nivel 1)
- HVL (High Volatility Level)
- C1 (Call Wall nivel 1)
- 0% (Open Interest?)
- (luego columnas repetidas para lado derecho)

Para CADA valor encontrado en la tabla, incluye la EXPIRY DATE:
EXPIRY|05/22|IVX|87.3|SKEW|237.26|NETGEX|119.3M|C1|235|P1|207.5

=== PARA IMÁGENES DE THINKORSWIM - CVD CON Z-SCORE ===
Busca estos valores en el panel CVD (Cumulative Volume Delta):
- CVD VALUE (número del CVD acumulado)
- CVD EMA (línea de media móvil del CVD)
- Z-SCORE o Z SCORE (desviación estándar del CVD, típicamente -3 a +3)
- Z-VOL o Z VOLUME (desviación estándar del volumen)
- VOLUMEN INSTITUCIONAL (velas coloreadas especialmente, típicamente cyan/magenta)

Z-SCORE Interpretación:
- > +2.0: Actividad institucional fuerte (STRONG_BUY)
- +1.0 a +2.0: Compra moderada (NORMAL)
- -1.0 a +1.0: Actividad normal (NORMAL)
- -2.0 a -1.0: Venta moderada (NORMAL)
- < -2.0: Presión institucional fuerte (STRONG_SELL)

=== REGLAS DE EXTRACCIÓN ===
1. Para CADA valor numérico, responde en este formato EXACTO (uno por línea):
   LABEL|VALOR|TIPO

2. Para valores de tabla con EXPIRY, usa formato extendido:
   EXPIRY|[FECHA]|[COLUMNA1]|[VALOR1]|[COLUMNA2]|[VALOR2]|...

3. TIPOS válidos:
   - GEX (para Call Wall, Put Wall, Net GEX, Gamma, HVL)
   - PRICE (para precios y medias móviles)
   - VOLATILITY (para IV, CVD, SKEW, Z-SCORE, Z-VOL)
   - EXPIRY (para datos de tabla con fecha)

4. Si ves números MUY GRANDES con M, B, K (millones, billions, miles), PRESERVA ESOS VALORES:
   - 124.25M → 124250000 O mantén como 124.25M
   - 3.16B → 3160000000 O mantén como 3.16B
   - Prefiere formato original si es claro

5. Siempre incluye al final:
   CONFIANZA|X
   Donde X es 0-100 indicando confianza en la extracción.

=== EJEMPLO DE SALIDA ===
CURRENT PRICE|220.66|PRICE
AVWAP HIGH|470.25|PRICE
AVWAP LOW|466.75|PRICE
EMA 21|467.80|PRICE
NET GAMMA|+124.25M|GEX
NET DELTA|+3.16B|GEX
GAMMA STATUS|Positive Gamma|GEX
C1|235|GEX
P1|207.5|GEX
EXPIRY|05/22|IVX|87.3|NETGEX|119.3M|C1|235|P1|207.5|EXPIRY
EXPIRY|05/26|IVX|61.0|NETGEX|129.6M|C1|235|P1|212.5|EXPIRY
IV PERCENT|67.5|VOLATILITY
CVD VALUE|8945|VOLATILITY
CVD EMA|7234|VOLATILITY
Z-SCORE|2.34|VOLATILITY
Z-VOL|1.89|VOLATILITY
CONFIANZA|88`
  }

  /**
   * Convierte valores con M/B/K a números reales
   */
  private static parseValueWithSuffix(valueStr: string): number {
    const cleanStr = valueStr.trim().toUpperCase()

    if (cleanStr.includes('M')) {
      return parseFloat(cleanStr.replace('M', '')) * 1_000_000
    }
    if (cleanStr.includes('B')) {
      return parseFloat(cleanStr.replace('B', '')) * 1_000_000_000
    }
    if (cleanStr.includes('K')) {
      return parseFloat(cleanStr.replace('K', '')) * 1_000
    }

    return parseFloat(cleanStr)
  }

  /**
   * Parsea la respuesta estructurada del modelo
   */
  private static parseExtractedData(extractedText: string, _filename: string): ExtractedData {
    const extractedNumbers: { label: string; value: string | number }[] = []
    let confidence = 50
    let gex: Partial<GEXData> = {}
    let priceAction: Partial<PriceActionData> = {}
    let volatilityCVD: Partial<VolatilityCVDData> = {}
    let gexCount = 0
    let priceCount = 0
    let volatilityCount = 0
    let netGamma: string | number | undefined
    let netDelta: string | number | undefined
    let gammaStatus: string | undefined
    const expiryChainData: Array<{ expiry: string; data: { [key: string]: string | number } }> = []

    // Parsear líneas
    const lines = extractedText.split('\n').filter(line => line.trim())

    for (const line of lines) {
      if (line.includes('CONFIANZA|')) {
        const [, valueStr] = line.split('|')
        confidence = Math.min(100, Math.max(0, parseInt(valueStr) || 50))
        continue
      }

      if (line.includes('EXPIRY|') && line.split('|').length > 3) {
        // Parsear datos de tabla EXPIRY
        const parts = line.split('|').map(p => p.trim())
        if (parts[0] === 'EXPIRY') {
          const expiry = parts[1]
          const expiryData: { [key: string]: string | number } = {}

          for (let i = 2; i < parts.length; i += 2) {
            const key = parts[i]
            const value = parts[i + 1]
            if (key && value) {
              const numValue = this.parseValueWithSuffix(value)
              expiryData[key.toLowerCase()] = isNaN(numValue) ? value : numValue
            }
          }

          if (Object.keys(expiryData).length > 0) {
            expiryChainData.push({ expiry, data: expiryData })
            gexCount++
          }
        }
        continue
      }

      if (line.includes('|')) {
        const parts = line.split('|').map(s => s.trim())
        if (parts.length < 3) continue

        const label = parts[0]
        const valueStr = parts[1]
        const type = parts[2]

        // Guardar valor original
        extractedNumbers.push({ label, value: valueStr })

        // Intentar convertir a número
        const numValue = this.parseValueWithSuffix(valueStr)
        const lowerLabel = label.toLowerCase()

        // Detectar NET GAMMA y NET DELTA (valores especiales de TanukiTrade)
        if (lowerLabel.includes('net gamma')) {
          netGamma = isNaN(numValue) ? valueStr : numValue
          gexCount++
          continue
        }
        if (lowerLabel.includes('net delta')) {
          netDelta = isNaN(numValue) ? valueStr : numValue
          gexCount++
          continue
        }
        if (lowerLabel.includes('gamma status') || lowerLabel.includes('gamma profile')) {
          gammaStatus = valueStr
          gexCount++
          continue
        }

        if (!isNaN(numValue)) {
          // Mapear a estructuras
          // GEX Data
          if (
            lowerLabel.includes('call wall 1') ||
            lowerLabel.includes('c1 ') ||
            (lowerLabel === 'c1' && type.includes('GEX'))
          ) {
            gex.callWall1 = numValue
            gexCount++
          } else if (lowerLabel.includes('call wall 2') || lowerLabel.includes('c2')) {
            gex.callWall2 = numValue
            gexCount++
          } else if (lowerLabel.includes('call wall 3') || lowerLabel.includes('c3')) {
            gex.callWall3 = numValue
            gexCount++
          } else if (
            lowerLabel.includes('put wall 1') ||
            lowerLabel.includes('p1 ') ||
            (lowerLabel === 'p1' && type.includes('GEX'))
          ) {
            gex.putWall1 = numValue
            gexCount++
          } else if (lowerLabel.includes('put wall 2') || lowerLabel.includes('p2')) {
            gex.putWall2 = numValue
            gexCount++
          } else if (lowerLabel.includes('put wall 3') || lowerLabel.includes('p3')) {
            gex.putWall3 = numValue
            gexCount++
          } else if (lowerLabel.includes('net gex')) {
            gex.netGEX = numValue
            gexCount++
          }

          // Price Action Data
          else if (lowerLabel.includes('current price')) {
            priceAction.currentPrice = numValue
            priceCount++
          } else if (lowerLabel.includes('vwap month') || (lowerLabel === 'vwap' && type.includes('PRICE'))) {
            priceAction.vwapMonth = numValue
            priceCount++
          } else if (lowerLabel.includes('avwap high')) {
            priceAction.avwapHigh = numValue
            priceCount++
          } else if (lowerLabel.includes('avwap low')) {
            priceAction.avwapLow = numValue
            priceCount++
          } else if (lowerLabel.includes('avwap month')) {
            priceAction.avwapMonth = numValue
            priceCount++
          } else if (lowerLabel.includes('poc month') || lowerLabel.includes('poc')) {
            priceAction.pocMonth = numValue
            priceCount++
          } else if (lowerLabel.includes('apvp high')) {
            priceAction.apvpHigh = numValue
            priceCount++
          } else if (lowerLabel.includes('apvp low')) {
            priceAction.apvpLow = numValue
            priceCount++
          } else if (lowerLabel.includes('ema 21') || lowerLabel.includes('ema21')) {
            priceAction.ema21 = numValue
            priceCount++
          } else if (lowerLabel.includes('sma 200') || lowerLabel.includes('sma200')) {
            priceAction.sma200 = numValue
            priceCount++
          }

          // Volatility & CVD Data
          else if (lowerLabel.includes('iv percent') || lowerLabel.includes('iv%')) {
            volatilityCVD.ivPercent = numValue
            volatilityCount++
          } else if (lowerLabel.includes('cvd value')) {
            volatilityCVD.cvdValue = numValue
            volatilityCount++
          } else if (lowerLabel.includes('cvd ema')) {
            volatilityCVD.cvdEMA = numValue
            volatilityCount++
          } else if (lowerLabel.includes('cvd delta')) {
            volatilityCVD.cvdDelta = numValue
            volatilityCount++
          } else if (lowerLabel.includes('z-score') || lowerLabel.includes('z score')) {
            volatilityCVD.zScore = numValue
            volatilityCount++
          } else if (lowerLabel.includes('z-vol') || lowerLabel.includes('z vol') || lowerLabel.includes('z volume')) {
            volatilityCVD.zVol = numValue
            volatilityCount++
          }
        }
      }
    }

    // Detectar tipo de imagen
    let detectedType: 'gex' | 'price_action' | 'mixed' | 'unknown' = 'unknown'
    if (gexCount > priceCount && gexCount > volatilityCount) {
      detectedType = 'gex'
    } else if (priceCount > gexCount && priceCount > volatilityCount) {
      detectedType = 'price_action'
    } else if (gexCount > 0 && (priceCount > 0 || volatilityCount > 0)) {
      detectedType = 'mixed'
    }

    // Calcular estatus de actividad institucional basado en Z-Score
    if (volatilityCVD.zScore !== undefined) {
      if (volatilityCVD.zScore > 2.0) {
        volatilityCVD.institutionalActivityStatus = 'strong_buy'
      } else if (volatilityCVD.zScore > 1.0) {
        volatilityCVD.institutionalActivityStatus = 'normal'
      } else if (volatilityCVD.zScore < -2.0) {
        volatilityCVD.institutionalActivityStatus = 'strong_sell'
      } else if (volatilityCVD.zScore < -1.0) {
        volatilityCVD.institutionalActivityStatus = 'normal'
      } else {
        volatilityCVD.institutionalActivityStatus = 'normal'
      }
    }

    return {
      gex: gexCount > 0 ? gex : undefined,
      priceAction: priceCount > 0 ? priceAction : undefined,
      volatilityCVD: volatilityCount > 0 ? volatilityCVD : undefined,
      confidence,
      detectedType,
      rawText: extractedText,
      extractedNumbers,
      expiryChainData: expiryChainData.length > 0 ? expiryChainData : undefined,
      netGamma,
      netDelta,
      gammaStatus,
    }
  }
}
