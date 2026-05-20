import { SetupValidation, ValidationResult } from '../types'

export class SetupValidatorService {
  /**
   * Valida un setup completo de opciones basado en criterios SOP10
   */
  static validateSetup(setup: SetupValidation): ValidationResult {
    const checks = {
      ivCheck: setup.volatilityCVD.ivPercent >= 50,
      gammaCheck: setup.gexData.gammaPositive,
      cvdCheck: setup.volatilityCVD.cvdDivergence !== 'none',
      priceConfluenceCheck: this.validatePriceConfluence(setup),
      trendCheck: this.validateTrend(setup),
      dteCheck: setup.options.daysToExpiration >= 30 && setup.options.daysToExpiration <= 45,
      deltaCheck: this.validateDelta(setup)
    }

    const confluenceScore = this.calculateConfluenceScore(checks, setup)
    const isValidSetup = confluenceScore >= 65
    const { recommendation, alternatives } = this.getRecommendation(setup, isValidSetup)
    const warnings = this.getWarnings(setup, checks)

    // Calcular targets
    const targetEntry = this.calculateTargetEntry(setup)
    const targetTP = this.calculateTargetTP(setup, targetEntry)
    const targetSL = this.calculateTargetSL(setup, targetEntry)

    return {
      confluenceScore,
      isValidSetup,
      checks,
      recommendation,
      alternatives,
      targetEntry,
      targetTP,
      targetSL,
      warnings,
      notes: this.getNotes(setup, checks)
    }
  }

  private static validatePriceConfluence(setup: SetupValidation): boolean {
    const price = setup.priceAction.currentPrice
    const vwapMonth = setup.priceAction.vwapMonth
    const avwapHigh = setup.priceAction.avwapHigh
    const avwapLow = setup.priceAction.avwapLow
    const apvpHigh = setup.priceAction.apvpHigh
    const apvpLow = setup.priceAction.apvpLow

    // Confluencia: precio cerca de VWAP, AVWAP, APVP
    const nearVWAP = Math.abs(price - vwapMonth) / vwapMonth < 0.01
    const nearAVWAP = price >= avwapLow && price <= avwapHigh
    const nearAPVP = price >= apvpLow && price <= apvpHigh

    return (nearVWAP && nearAVWAP) || (nearAVWAP && nearAPVP) || (nearVWAP && nearAPVP)
  }

  private static validateTrend(setup: SetupValidation): boolean {
    const price = setup.priceAction.currentPrice
    const ema21 = setup.priceAction.ema21
    const sma200 = setup.priceAction.sma200

    // Validar alineación de tendencia
    // Alcista: precio > EMA21 > SMA200
    // Bajista: precio < EMA21 < SMA200
    const bullish = price > ema21 && ema21 > sma200
    const bearish = price < ema21 && ema21 < sma200

    return bullish || bearish
  }

  private static validateDelta(setup: SetupValidation): boolean {
    const delta = Math.abs(setup.options.delta)
    // Idealmente 20-30 OTM o 10-20 ITM
    return (delta >= 20 && delta <= 30) || (delta >= 10 && delta <= 20)
  }

  private static calculateConfluenceScore(checks: any, setup: SetupValidation): number {
    let score = 0
    const weights = {
      ivCheck: 15,
      gammaCheck: 15,
      cvdCheck: 15,
      priceConfluenceCheck: 20,
      trendCheck: 15,
      dteCheck: 10,
      deltaCheck: 10
    }

    Object.keys(checks).forEach((key: string) => {
      if (checks[key as keyof typeof checks]) {
        score += weights[key as keyof typeof weights]
      }
    })

    // Bonificación por IV muy alto
    if (setup.volatilityCVD.ivPercent >= 75) {
      score = Math.min(100, score + 10)
    }

    // Penalización si divergencia CVD es contraria a la dirección
    if (setup.volatilityCVD.cvdDivergence === 'bearish' && setup.options.optionType === 'put') {
      score = Math.max(0, score - 5)
    }

    // Z-Score Impact (Institutional Activity)
    if (setup.volatilityCVD.zScore !== undefined) {
      if (setup.volatilityCVD.zScore > 2.0) {
        // Strong institutional buying
        score = Math.min(100, score + 15)
      } else if (setup.volatilityCVD.zScore < -2.0) {
        // Strong institutional selling
        score = Math.max(0, score - 10)
      }
    }

    return Math.round(score)
  }

  private static getRecommendation(setup: SetupValidation, isValidSetup: boolean): { recommendation: string; alternatives: Array<{ strategy: string; reason: string; trendCompatibility: number }> } {
    const alternatives: Array<{ strategy: string; reason: string; trendCompatibility: number }> = []

    if (!isValidSetup) {
      return { recommendation: 'WAIT', alternatives: [] }
    }

    const isBullish = setup.priceAction.currentPrice > setup.priceAction.ema21
    const trend = isBullish ? 'BULLISH' : 'BEARISH'

    // Estrategias con su compatibilidad por tendencia
    const strategyCompatibility = {
      BULL_PUT_SPREAD: isBullish ? 95 : 30,       // Óptima bullish, pobre bearish
      BEAR_CALL_SPREAD: !isBullish ? 95 : 30,     // Óptima bearish, pobre bullish
      BULL_CALL_SPREAD: isBullish ? 90 : 25,      // Muy buena bullish
      BEAR_PUT_SPREAD: !isBullish ? 90 : 25,      // Muy buena bearish
      LONG_CALL: isBullish ? 95 : 35,             // Excelente bullish
      LONG_PUT: !isBullish ? 95 : 35,             // Excelente bearish
      IRON_CONDOR: 70,                             // Neutral - siempre funciona
      IRON_BUTTERFLY: 75,                          // Neutral - muy restrictivo
      STRADDLE: 60,                                // Neutral - depende volatilidad
      STRANGLE: 65,                                // Neutral - menos restrictivo que straddle
      COLLAR: 70,                                  // Neutral - protección
      COVERED_CALL: isBullish ? 50 : 60,          // Mejor bearish (protección)
      PROTECTIVE_PUT: !isBullish ? 50 : 60        // Mejor bullish (protección)
    }

    // Recomendación principal: según tendencia
    let mainRecommendation = 'IRON_CONDOR'
    if (isBullish) {
      mainRecommendation = 'BULL_PUT_SPREAD'
    } else {
      mainRecommendation = 'BEAR_CALL_SPREAD'
    }

    // Alternativas: todas las estrategias, ordenadas por compatibilidad
    Object.entries(strategyCompatibility).forEach(([strategy, compatibility]) => {
      if (strategy !== mainRecommendation) {
        let reason = ''
        if (compatibility >= 90) {
          reason = `Excelente compatibilidad con tendencia ${trend}`
        } else if (compatibility >= 70) {
          reason = `Buena compatibilidad con tendencia ${trend}`
        } else if (compatibility >= 50) {
          reason = `Compatible con tendencia ${trend}`
        } else if (compatibility >= 30) {
          reason = `Baja compatibilidad con tendencia ${trend} (alternativa defensiva)`
        } else {
          reason = `Contraria a tendencia ${trend} (apuesta contraria)`
        }

        alternatives.push({
          strategy,
          reason,
          trendCompatibility: compatibility as number
        })
      }
    })

    // Ordenar alternativas por compatibilidad (descendente)
    alternatives.sort((a, b) => b.trendCompatibility - a.trendCompatibility)

    return {
      recommendation: mainRecommendation,
      alternatives: alternatives.slice(0, 5)  // Top 5 alternativas
    }
  }

  private static calculateTargetEntry(setup: SetupValidation): number {
    // Entrada en confluencia de VWAP y AVWAP
    const vwap = setup.priceAction.vwapMonth
    const avwapMid = (setup.priceAction.avwapHigh + setup.priceAction.avwapLow) / 2
    return (vwap + avwapMid) / 2
  }

  private static calculateTargetTP(setup: SetupValidation, entry: number): number {
    // 50% de ganancia para crédito
    if (setup.options.strategy.includes('CREDIT')) {
      return entry * 0.995 // Punto de quiebre es 50% de la prima
    }
    // 200% de ganancia para débito (el doble del pago)
    return entry * 0.98
  }

  private static calculateTargetSL(setup: SetupValidation, entry: number): number {
    // Stop Loss al -200% o si cruza muro de GEX (P1/C1 = muros más cercanos)
    if (setup.options.optionType === 'put') {
      return Math.max(entry * 1.03, setup.gexData.putWall1 * 1.01)
    } else {
      return Math.min(entry * 0.97, setup.gexData.callWall1 * 0.99)
    }
  }

  private static getWarnings(setup: SetupValidation, checks: any): string[] {
    const warnings: string[] = []

    if (setup.volatilityCVD.ivPercent < 75) {
      warnings.push(`⚠️ IV Percent bajo (${setup.volatilityCVD.ivPercent}%), idealmente > 75%`)
    }

    if (!checks.gammaCheck) {
      warnings.push('⚠️ Gamma no es positivo, considerado no ideal para crédito')
    }

    if (setup.volatilityCVD.cvdDivergence === 'none') {
      warnings.push('⚠️ No hay divergencia CVD clara para confirmación')
    }

    if (!checks.priceConfluenceCheck) {
      warnings.push('⚠️ Precio no en confluencia de extremos (AVWAP, APVP, Muros GEX)')
    }

    if (!checks.trendCheck) {
      warnings.push('⚠️ Tendencia no alineada con EMA21/SMA200')
    }

    if (setup.options.daysToExpiration < 30 || setup.options.daysToExpiration > 45) {
      warnings.push(`⚠️ DTE ${setup.options.daysToExpiration} fuera del rango óptimo (30-45)`)
    }

    if (!checks.deltaCheck) {
      warnings.push(`⚠️ Delta ${setup.options.delta} fuera del rango ideal`)
    }

    // Z-Score Warnings
    if (setup.volatilityCVD.zScore !== undefined) {
      if (setup.volatilityCVD.zScore < -2.0) {
        warnings.push(`⚠️ Z-Score muy negativo (${setup.volatilityCVD.zScore.toFixed(2)}): Presión institucional fuerte, espera mejor confluencia`)
      }
    }

    return warnings
  }

  private static getNotes(setup: SetupValidation, checks: any): string[] {
    const notes: string[] = []

    const passedChecks = Object.values(checks).filter(Boolean).length
    notes.push(`✅ ${passedChecks}/7 criterios validados`)

    if (setup.volatilityCVD.ivPercent >= 75) {
      notes.push('⭐ IV Percent muy alto - Setup favorable')
    }

    if (setup.gexData.gammaPositive) {
      notes.push('⭐ Gamma positivo - Bueno para crédito')
    }

    if (setup.volatilityCVD.cvdDivergence !== 'none') {
      notes.push(`⭐ CVD ${setup.volatilityCVD.cvdDivergence} confirmado`)
    }

    if (setup.volatilityCVD.institutionalVolume) {
      notes.push('⭐ Volumen institucional detectado (> 1.5X promedio)')
    }

    // Z-Score Notes (Institutional Activity)
    if (setup.volatilityCVD.zScore !== undefined) {
      if (setup.volatilityCVD.zScore > 2.0) {
        notes.push(`⭐ Z-Score ${setup.volatilityCVD.zScore.toFixed(2)}: Actividad institucional fuerte (COMPRA)`)
      } else if (setup.volatilityCVD.zScore < -2.0) {
        notes.push(`⚠️ Z-Score ${setup.volatilityCVD.zScore.toFixed(2)}: Actividad institucional fuerte (VENTA)`)
      }
    }

    return notes
  }
}
