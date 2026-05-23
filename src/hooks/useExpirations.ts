import { useState, useEffect, useCallback } from 'react'

interface useExpirationsState {
  expirations: string[]
  loading: boolean
  error: string | null
}

/**
 * Hook to fetch expiration dates for a symbol
 * Used for expiration selector in Market Analysis tab
 *
 * @param symbol - Stock symbol to fetch expirations for
 * @returns Expiration dates, loading, and error states
 */
export const useExpirations = (symbol: string | null) => {
  const [state, setState] = useState<useExpirationsState>({
    expirations: [],
    loading: false,
    error: null,
  })

  const fetchExpirations = useCallback(async () => {
    if (!symbol) {
      setState({
        expirations: [],
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

      const response = await fetch(`/api/expirations/${symbol.toUpperCase()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch expirations: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        setState(prev => ({
          ...prev,
          expirations: result.data,
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
  }, [symbol])

  useEffect(() => {
    // Debounce the fetch
    const timer = setTimeout(() => {
      fetchExpirations()
    }, 300)

    return () => clearTimeout(timer)
  }, [symbol, fetchExpirations])

  return {
    expirations: state.expirations,
    loading: state.loading,
    error: state.error,
  }
}

export default useExpirations
