import { useState, useEffect, useCallback } from 'react'

interface UseSymbolDiscoveryState {
  symbols: string[]
  loading: boolean
  error: string | null
}

/**
 * Hook to fetch available symbols from backend
 * Used for symbol autocomplete in Market Analysis tab
 *
 * @param query - Search query to filter symbols (optional)
 * @returns Symbols matching query, loading, and error states
 */
export const useSymbolDiscovery = (query?: string) => {
  const [state, setState] = useState<UseSymbolDiscoveryState>({
    symbols: [],
    loading: false,
    error: null,
  })

  const fetchSymbols = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }))

      const isDev = import.meta.env.DEV
      const apiOrigin = isDev ? 'http://localhost:8080' : window.location.origin
      const url = new URL('/api/symbols', apiOrigin)
      if (query) {
        url.searchParams.set('q', query)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Failed to fetch symbols: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        setState(prev => ({
          ...prev,
          symbols: result.data,
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
  }, [query])

  useEffect(() => {
    // Debounce the fetch
    const timer = setTimeout(() => {
      fetchSymbols()
    }, 300)

    return () => clearTimeout(timer)
  }, [query, fetchSymbols])

  return {
    symbols: state.symbols,
    loading: state.loading,
    error: state.error,
  }
}

export default useSymbolDiscovery
