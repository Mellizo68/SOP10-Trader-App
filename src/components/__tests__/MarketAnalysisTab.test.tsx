import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MarketAnalysisTab } from '../TradeJournal/MarketAnalysisTab'

// Mock useMarketData hook
vi.mock('../../hooks/useMarketData', () => ({
  useMarketData: vi.fn((symbol: string) => ({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    refetch: vi.fn(),
  })),
}))

describe('MarketAnalysisTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should render symbol input field', () => {
    render(<MarketAnalysisTab symbol="SPY" />)

    const input = screen.getByRole('textbox')
    expect(input).toBeTruthy()
    expect(input).toHaveDisplayValue('SPY')
  })

  it('should debounce symbol input (300ms)', async () => {
    const onSymbolChange = vi.fn()
    const { useMarketData } = await import('../../hooks/useMarketData')

    render(<MarketAnalysisTab symbol="SPY" onSymbolChange={onSymbolChange} />)

    const input = screen.getByRole('textbox')

    // Type "QQQ" character by character
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Q' } })
      fireEvent.change(input, { target: { value: 'QQ' } })
      fireEvent.change(input, { target: { value: 'QQQ' } })
    })

    // Callback should not be called yet (within 300ms window)
    expect(onSymbolChange).not.toHaveBeenCalled()

    // Fast-forward 300ms
    vi.advanceTimersByTime(300)

    // Run pending timers to let the debounce callback execute
    await act(async () => {
      vi.runAllTimers()
    })

    // Now callback should be called
    expect(onSymbolChange).toHaveBeenCalledWith('QQQ')

    // Should only be called once, not three times (for Q, QQ, QQQ)
    expect(onSymbolChange).toHaveBeenCalledTimes(1)
  })

  it('should show loading state while fetching', async () => {
    const { useMarketData } = await import('../../hooks/useMarketData')
    ;(useMarketData as any).mockReturnValueOnce({
      data: null,
      loading: true,
      error: null,
      lastUpdated: null,
      refetch: vi.fn(),
    })

    render(<MarketAnalysisTab symbol="SPY" />)

    expect(screen.getByText(/Fetching market data/i)).toBeTruthy()
  })

  it('should display error message on fetch failure', async () => {
    const { useMarketData } = await import('../../hooks/useMarketData')
    ;(useMarketData as any).mockReturnValueOnce({
      data: null,
      loading: false,
      error: 'Failed to fetch market data',
      lastUpdated: null,
      refetch: vi.fn(),
    })

    render(<MarketAnalysisTab symbol="INVALID" />)

    // Main error header should be visible
    expect(screen.getByText('⚠️ Error')).toBeTruthy()

    // Error message appears in multiple components (main error + GEX error + Greeks error)
    // Verify that at least one instance of the error message is displayed
    const errorMessages = screen.getAllByText('Failed to fetch market data')
    expect(errorMessages.length).toBeGreaterThan(0)
  })

  it('should update input immediately when typing (responsive UX)', async () => {
    render(<MarketAnalysisTab symbol="SPY" />)

    const input = screen.getByDisplayValue('SPY') as HTMLInputElement

    // Type a character
    await act(async () => {
      fireEvent.change(input, { target: { value: 'QQQ' } })
    })

    // Input should update immediately (not wait for debounce)
    expect(input.value).toBe('QQQ')
  })

  it('should call refetch when Refresh button is clicked', async () => {
    const refetchMock = vi.fn()
    const { useMarketData } = await import('../../hooks/useMarketData')
    ;(useMarketData as any).mockReturnValueOnce({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
      refetch: refetchMock,
    })

    render(<MarketAnalysisTab symbol="SPY" />)

    const refreshButton = screen.getByRole('button', { name: /Refresh/i })
    await act(async () => {
      fireEvent.click(refreshButton)
    })

    expect(refetchMock).toHaveBeenCalled()
  })

  it('should clear previous debounce timer when typing multiple times', async () => {
    const onSymbolChange = vi.fn()

    render(<MarketAnalysisTab symbol="SPY" onSymbolChange={onSymbolChange} />)

    const input = screen.getByRole('textbox')

    // Type first symbol
    await act(async () => {
      fireEvent.change(input, { target: { value: 'QQQ' } })
      vi.advanceTimersByTime(100) // Partial debounce

      // Type another symbol (should reset timer)
      fireEvent.change(input, { target: { value: 'AAPL' } })
      vi.advanceTimersByTime(100) // Another partial debounce
    })

    // Still shouldn't have called (need full 300ms from last change)
    expect(onSymbolChange).not.toHaveBeenCalled()

    // Advance the remaining 200ms
    vi.advanceTimersByTime(200)

    await act(async () => {
      vi.runAllTimers()
    })

    // Should be called once with the final value
    expect(onSymbolChange).toHaveBeenCalledWith('AAPL')
    expect(onSymbolChange).toHaveBeenCalledTimes(1)
  })

  it('should handle empty symbol input', async () => {
    const onSymbolChange = vi.fn()

    render(<MarketAnalysisTab symbol="SPY" onSymbolChange={onSymbolChange} />)

    const input = screen.getByRole('textbox')

    // Clear input
    await act(async () => {
      fireEvent.change(input, { target: { value: '' } })
      vi.advanceTimersByTime(300)
    })

    await act(async () => {
      vi.runAllTimers()
    })

    expect(onSymbolChange).toHaveBeenCalledWith('')
  })

  it('should cleanup debounce timer on unmount', async () => {
    const { unmount } = render(<MarketAnalysisTab symbol="SPY" />)

    const input = screen.getByRole('textbox')

    // Start typing
    await act(async () => {
      fireEvent.change(input, { target: { value: 'QQQ' } })
    })

    // Unmount before debounce completes
    expect(() => unmount()).not.toThrow()
  })

  it('should convert input to uppercase', async () => {
    const onSymbolChange = vi.fn()

    render(<MarketAnalysisTab symbol="spy" onSymbolChange={onSymbolChange} />)

    const input = screen.getByRole('textbox')

    // Type lowercase
    await act(async () => {
      fireEvent.change(input, { target: { value: 'qqq' } })
      vi.advanceTimersByTime(300)
    })

    await act(async () => {
      vi.runAllTimers()
    })

    expect(onSymbolChange).toHaveBeenCalledWith('QQQ')
  })
})
