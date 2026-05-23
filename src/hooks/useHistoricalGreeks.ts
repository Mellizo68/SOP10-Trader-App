import { useState, useEffect, useCallback } from 'react'

export interface HistoricalGreekPoint {
  date: string
  delta: number
  gamma: number
  theta: number
  vega: number
  iv: number
  price: number
}

interface UseHistoricalGreeksState {
  data: HistoricalGreekPoint[]
  loading: boolean
  error: string | null
}

interface UseHistoricalGreeksParams {
  symbol: string
  strike: number
  expiration: string
  type?: 'call' | 'put'
  startDate: string
  endDate: string
}

/**
 * Hook to fetch historical Greeks data for a specific option contract
 * Used for historical Greeks charting in Market Analysis tab
 *
 * @param params - Symbol, strike, expiration, dates, and option type
 * @returns Historical Greeks data, loading, and error states
 */
export const useHistoricalGreeks = (params: UseHistoricalGreeksParams) => {
  const [state, setState] = useState<UseHistoricalGreeksState>({
    data: [],
    loading: false,
    error: null,
  })

  const fetchHistoricalGreeks = useCallback(async () => {
    if (!params.symbol || !params.strike || !params.expiration || !params.startDate || !params.endDate) {
      setState({
        data: [],
        loading: false,
        error: null,
      })
      return
    }

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }))

      const url = new URL(`/api/market/history/${params.symbol.toUpperCase()}`, window.location.origin)
      url.searchParams.set('strike', params.strike.toString())
      url.searchParams.set('expiration', params.expiration)
      url.searchParams.set('type', params.type || 'call')
      url.searchParams.set('startDate', params.startDate)
      url.searchParams.set('endDate', params.endDate)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Failed to fetch historical Greeks: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        // Transform data to match expected format
        const transformedData: HistoricalGreekPoint[] = result.data.map((item: any) => ({
          date: item.date || new Date().toISOString().split('T')[0],
          delta: item.delta || 0,
          gamma: item.gamma || 0,
          theta: item.theta || 0,
          vega: item.vega || 0,
          iv: item.impliedVolatility || 0,
          price: item.close || 0,
        }))

        setState(prev => ({
          ...prev,
          data: transformedData,
          loading: false,
        }))
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }
  }, [params])

  useEffect(() => {
    fetchHistoricalGreeks()
  }, [fetchHistoricalGreeks])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
  }
}

export default useHistoricalGreeks
