import { GEXData, PriceActionData, VolatilityCVDData } from '../types'

export interface ExtractedData {
  gex?: Partial<GEXData>
  priceAction?: Partial<PriceActionData>
  volatilityCVD?: Partial<VolatilityCVDData>
  confidence: number
  detectedType: 'gex' | 'price_action' | 'mixed' | 'unknown'
  rawText: string
  extractedNumbers: { label: string; value: number }[]
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

Si es una imagen de TradingView o similar, busca:
- PRECIO ACTUAL
- VWAP (Volume Weighted Average Price)
- AVWAP (Anchored VWAP) - valores alto, bajo
- POC (Point of Control)
- APVP (Volume Profile) - valores alto, bajo
- EMA 21 (Media Móvil Exponencial 21)
- SMA 200 (Media Móvil Simple 200)

Si es una imagen de GEX (Gamma Exposure) o TanukiTrade, busca:
- CALL WALL 1, 2, 3 (C1, C2, C3) - Muros de Resistencia
- PUT WALL 1, 2, 3 (P1, P2, P3) - Muros de Soporte
- NET GEX (valor total)
- GAMMA FLIP o HVL (High Volatility Likely)
- GAMMA POSITIVO/NEGATIVO

Si la imagen contiene CVD o Volatilidad:
- CVD VALUE (Cumulative Volume Delta)
- CVD EMA
- CVD DELTA o VELOCIDAD
- CVD DIVERGENCIA (alcista/bajista)
- IV PERCENT (Volatilidad Implícita)
- VOLUMEN INSTITUCIONAL

Para CADA valor encontrado, responde en este formato EXACTO (uno por línea):
LABEL|VALOR|TIPO

Donde LABEL es el nombre del indicador, VALOR es el número extraído, y TIPO es uno de:
- GEX (para Call Wall, Put Wall, Net GEX, Gamma)
- PRICE (para precios y promedios)
- VOLATILITY (para IV, CVD)

Al final, incluye una línea:
CONFIANZA|X

Donde X es un número 0-100 indicando tu confianza en la extracción.

Ejemplo de salida:
CALL WALL 1|4850.25|GEX
PUT WALL 1|4750.50|GEX
CURRENT PRICE|4800.00|PRICE
EMA 21|4795.30|PRICE
IV PERCENT|67.5|VOLATILITY
CONFIANZA|85`
  }

  /**
   * Parsea la respuesta estructurada del modelo
   */
  private static parseExtractedData(extractedText: string, _filename: string): ExtractedData {
    const extractedNumbers: { label: string; value: number }[] = []
    let confidence = 50
    let gex: Partial<GEXData> = {}
    let priceAction: Partial<PriceActionData> = {}
    let volatilityCVD: Partial<VolatilityCVDData> = {}
    let gexCount = 0
    let priceCount = 0
    let volatilityCount = 0

    // Parsear líneas
    const lines = extractedText.split('\n').filter(line => line.trim())

    for (const line of lines) {
      if (line.includes('CONFIANZA|')) {
        const [, valueStr] = line.split('|')
        confidence = Math.min(100, Math.max(0, parseInt(valueStr) || 50))
        continue
      }

      if (line.includes('|')) {
        const [label, valueStr] = line.split('|').map(s => s.trim())
        const value = parseFloat(valueStr)

        if (!isNaN(value)) {
          extractedNumbers.push({ label, value })

          // Mapear a estructuras
          const lowerLabel = label.toLowerCase()

          // GEX Data
          if (lowerLabel.includes('call wall 1') || lowerLabel.includes('c1')) {
            gex.callWall1 = value
            gexCount++
          } else if (lowerLabel.includes('call wall 2') || lowerLabel.includes('c2')) {
            gex.callWall2 = value
            gexCount++
          } else if (lowerLabel.includes('call wall 3') || lowerLabel.includes('c3')) {
            gex.callWall3 = value
            gexCount++
          } else if (lowerLabel.includes('put wall 1') || lowerLabel.includes('p1')) {
            gex.putWall1 = value
            gexCount++
          } else if (lowerLabel.includes('put wall 2') || lowerLabel.includes('p2')) {
            gex.putWall2 = value
            gexCount++
          } else if (lowerLabel.includes('put wall 3') || lowerLabel.includes('p3')) {
            gex.putWall3 = value
            gexCount++
          } else if (lowerLabel.includes('net gex')) {
            gex.netGEX = value
            gexCount++
          }

          // Price Action Data
          else if (lowerLabel.includes('current price')) {
            priceAction.currentPrice = value
            priceCount++
          } else if (lowerLabel.includes('vwap month') || lowerLabel.includes('vwap')) {
            priceAction.vwapMonth = value
            priceCount++
          } else if (lowerLabel.includes('avwap high')) {
            priceAction.avwapHigh = value
            priceCount++
          } else if (lowerLabel.includes('avwap low')) {
            priceAction.avwapLow = value
            priceCount++
          } else if (lowerLabel.includes('avwap month')) {
            priceAction.avwapMonth = value
            priceCount++
          } else if (lowerLabel.includes('poc month') || lowerLabel.includes('poc')) {
            priceAction.pocMonth = value
            priceCount++
          } else if (lowerLabel.includes('apvp high')) {
            priceAction.apvpHigh = value
            priceCount++
          } else if (lowerLabel.includes('apvp low')) {
            priceAction.apvpLow = value
            priceCount++
          } else if (lowerLabel.includes('ema 21') || lowerLabel.includes('ema21')) {
            priceAction.ema21 = value
            priceCount++
          } else if (lowerLabel.includes('sma 200') || lowerLabel.includes('sma200')) {
            priceAction.sma200 = value
            priceCount++
          }

          // Volatility & CVD Data
          else if (lowerLabel.includes('iv percent') || lowerLabel.includes('iv%')) {
            volatilityCVD.ivPercent = value
            volatilityCount++
          } else if (lowerLabel.includes('cvd value') || lowerLabel.includes('cvd ')) {
            volatilityCVD.cvdValue = value
            volatilityCount++
          } else if (lowerLabel.includes('cvd ema')) {
            volatilityCVD.cvdEMA = value
            volatilityCount++
          } else if (lowerLabel.includes('cvd delta')) {
            volatilityCVD.cvdDelta = value
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

    return {
      gex: gexCount > 0 ? gex : undefined,
      priceAction: priceCount > 0 ? priceAction : undefined,
      volatilityCVD: volatilityCount > 0 ? volatilityCVD : undefined,
      confidence,
      detectedType,
      rawText: extractedText,
      extractedNumbers,
    }
  }
}
