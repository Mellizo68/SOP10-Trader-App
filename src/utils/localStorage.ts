import { TradeEntry } from '../types'

const TRADES_KEY = 'sop10_trades'

/**
 * Guardar trades en localStorage
 */
export function saveTrades(trades: TradeEntry[]): void {
  try {
    const serialized = JSON.stringify(trades, (_, value) => {
      // Convertir Dates a ISO strings
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    })
    localStorage.setItem(TRADES_KEY, serialized)
  } catch (error) {
    console.error('Error saving trades to localStorage:', error)
  }
}

/**
 * Cargar trades desde localStorage
 */
export function loadTrades(): TradeEntry[] {
  try {
    const serialized = localStorage.getItem(TRADES_KEY)
    if (!serialized) {
      return []
    }

    const trades = JSON.parse(serialized, (key, value) => {
      // Convertir ISO strings de vuelta a Dates
      if (key === 'dateEntry' || key === 'exitDate') {
        return new Date(value)
      }
      return value
    })

    return Array.isArray(trades) ? trades : []
  } catch (error) {
    console.error('Error loading trades from localStorage:', error)
    return []
  }
}

/**
 * Limpiar todos los trades
 */
export function clearTrades(): void {
  try {
    localStorage.removeItem(TRADES_KEY)
  } catch (error) {
    console.error('Error clearing trades:', error)
  }
}

/**
 * Obtener número total de trades (para generar entry number)
 */
export function getNextEntryNumber(): number {
  const trades = loadTrades()
  return trades.length + 1
}
