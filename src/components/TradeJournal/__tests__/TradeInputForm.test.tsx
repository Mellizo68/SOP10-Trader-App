import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TradeInputForm from '../TradeInputForm'
import { TradeEntry, ValidationResult } from '../../../types'

/**
 * Phase 6.3: Frontend Component Tests - TradeInputForm
 *
 * Tests the trade creation form component for:
 * - Form rendering and layout
 * - Input field validation
 * - Form submission and API integration
 * - Success/error message handling
 * - Form reset after submission
 * - Decimal price handling
 * - Optional field handling
 * - Pre-filling with validation results
 */

// Mock the apiClient
vi.mock('../../../api/tradeClient', () => ({
  apiClient: {
    createTrade: vi.fn(),
    getTrades: vi.fn(),
    getTradeById: vi.fn(),
    updateTrade: vi.fn(),
    deleteTrade: vi.fn(),
    closeTrade: vi.fn(),
  },
}))

import { apiClient } from '../../../api/tradeClient'

describe('TradeInputForm Component', () => {
  const mockOnTradeCreated = vi.fn()

  beforeEach(() => {
    mockOnTradeCreated.mockClear()
    vi.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('should render form with title and submit button', () => {
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      expect(screen.getByText(/Crear Nuevo Trade/i)).toBeInTheDocument()
      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should render all required input fields', () => {
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      expect(screen.getByLabelText(/Symbol \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Strategy \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Entry Price \*/i)).toBeInTheDocument()
    })

    it('should render optional input fields', () => {
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      expect(screen.getByLabelText(/Strike Price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Delta/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Days to Exp/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/IV Percent/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Confluence Score/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Take Profit/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Stop Loss/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Comments/i)).toBeInTheDocument()
    })

    it('should render strategy dropdown with predefined options', () => {
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const strategySelect = screen.getByLabelText(/Strategy \*/i) as HTMLSelectElement
      expect(strategySelect).toBeInTheDocument()
      expect(strategySelect.querySelector('option[value="BULL_PUT_SPREAD"]')).toBeInTheDocument()
      expect(strategySelect.querySelector('option[value="BEAR_CALL_SPREAD"]')).toBeInTheDocument()
      expect(strategySelect.querySelector('option[value="LONG_CALL"]')).toBeInTheDocument()
    })

    it('should render GEX status dropdown with positivo/negativo options', () => {
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const gexSelect = screen.getByLabelText(/GEX Status/i) as HTMLSelectElement
      expect(gexSelect.querySelector('option[value="positivo"]')).toBeInTheDocument()
      expect(gexSelect.querySelector('option[value="negativo"]')).toBeInTheDocument()
    })
  })

  describe('Form Input Changes', () => {
    it('should update form state on symbol input change', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const symbolInput = screen.getByLabelText(/Symbol \*/i) as HTMLInputElement
      await user.type(symbolInput, 'AAPL')

      expect(symbolInput.value).toBe('AAPL')
    })

    it('should accept decimal entry prices', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const entryPriceInput = screen.getByLabelText(/Entry Price \*/i) as HTMLInputElement
      await user.type(entryPriceInput, '100.50')

      // HTML number inputs normalize decimal values (remove trailing zeros)
      expect(entryPriceInput.value).toBe('100.5')
    })

    it('should accept decimal values in optional numeric fields', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const deltainput = screen.getByLabelText(/Delta/i) as HTMLInputElement
      const ivInput = screen.getByLabelText(/IV Percent/i) as HTMLInputElement

      await user.type(deltainput, '0.65')
      await user.type(ivInput, '25.5')

      expect(deltainput.value).toBe('0.65')
      expect(ivInput.value).toBe('25.5')
    })

    it('should update form state on multiple field changes', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const symbolInput = screen.getByLabelText(/Symbol \*/i) as HTMLInputElement
      const strategySelect = screen.getByLabelText(/Strategy \*/i) as HTMLSelectElement
      const entryPriceInput = screen.getByLabelText(/Entry Price \*/i) as HTMLInputElement

      await user.type(symbolInput, 'SPY')
      await user.selectOptions(strategySelect, 'BULL_PUT_SPREAD')
      await user.type(entryPriceInput, '150.00')

      expect(symbolInput.value).toBe('SPY')
      expect(strategySelect.value).toBe('BULL_PUT_SPREAD')
      // HTML number inputs normalize decimal values (remove trailing zeros)
      expect(entryPriceInput.value).toBe('150')
    })

    it('should convert symbol to uppercase on submission', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const symbolInput = screen.getByLabelText(/Symbol \*/i) as HTMLInputElement
      const strategySelect = screen.getByLabelText(/Strategy \*/i)
      const entryPriceInput = screen.getByLabelText(/Entry Price \*/i)

      vi.mocked(apiClient.createTrade).mockResolvedValueOnce({
        id: 'trade_123',
        entryNumber: 1,
        dateEntry: new Date().toISOString(),
        symbol: 'SPY',
        strategy: 'BULL_PUT_SPREAD',
        entryPrice: 1.5,
        status: 'open',
        screenshots: [],
      } as TradeEntry)

      await user.type(symbolInput, 'spy')
      await user.selectOptions(strategySelect, 'BULL_PUT_SPREAD')
      await user.type(entryPriceInput, '1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(apiClient.createTrade).toHaveBeenCalled()
        const callArgs = vi.mocked(apiClient.createTrade).mock.calls[0][0]
        expect(callArgs.symbol).toBe('SPY')
      })
    })
  })

  describe('Form Submission & Validation', () => {
    it('should submit form with valid required fields', async () => {
      const user = userEvent.setup()
      const mockTrade: TradeEntry = {
        id: 'trade_123',
        entryNumber: 1,
        dateEntry: new Date().toISOString(),
        symbol: 'SPY',
        strategy: 'BULL_PUT_SPREAD',
        entryPrice: 1.5,
        status: 'open',
        screenshots: [],
      }

      vi.mocked(apiClient.createTrade).mockResolvedValueOnce(mockTrade)

      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'SPY')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_PUT_SPREAD')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(apiClient.createTrade).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'SPY',
            strategy: 'BULL_PUT_SPREAD',
            entryPrice: 1.5,
          })
        )
        expect(mockOnTradeCreated).toHaveBeenCalledWith(mockTrade)
      })
    })

    it('should show validation error for missing symbol', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_PUT_SPREAD')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Symbol es requerido/i)).toBeInTheDocument()
        expect(apiClient.createTrade).not.toHaveBeenCalled()
      })
    })

    it('should show validation error for missing strategy', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'SPY')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Strategy es requerida/i)).toBeInTheDocument()
        expect(apiClient.createTrade).not.toHaveBeenCalled()
      })
    })

    it('should show validation error for missing entry price', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'SPY')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_PUT_SPREAD')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Entry Price debe ser mayor a 0/i)).toBeInTheDocument()
        expect(apiClient.createTrade).not.toHaveBeenCalled()
      })
    })

    it('should show validation error for zero entry price', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'SPY')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_PUT_SPREAD')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '0')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Entry Price debe ser mayor a 0/i)).toBeInTheDocument()
        expect(apiClient.createTrade).not.toHaveBeenCalled()
      })
    })

    it('should show validation error for negative entry price', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'SPY')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_PUT_SPREAD')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '-1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Entry Price debe ser mayor a 0/i)).toBeInTheDocument()
        expect(apiClient.createTrade).not.toHaveBeenCalled()
      })
    })

    it('should accept form with only required fields', async () => {
      const user = userEvent.setup()
      const mockTrade: TradeEntry = {
        id: 'trade_456',
        entryNumber: 2,
        dateEntry: new Date().toISOString(),
        symbol: 'AAPL',
        strategy: 'LONG_CALL',
        entryPrice: 2.0,
        status: 'open',
        screenshots: [],
      }

      vi.mocked(apiClient.createTrade).mockResolvedValueOnce(mockTrade)

      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'AAPL')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'LONG_CALL')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '2.00')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(apiClient.createTrade).toHaveBeenCalled()
        expect(mockOnTradeCreated).toHaveBeenCalledWith(mockTrade)
      })
    })

    it('should accept form with optional fields', async () => {
      const user = userEvent.setup()
      const mockTrade: TradeEntry = {
        id: 'trade_789',
        entryNumber: 3,
        dateEntry: new Date().toISOString(),
        symbol: 'QQQ',
        strategy: 'BULL_CALL_SPREAD',
        strikePrice: 450.0,
        delta: 0.65,
        daysToExpiration: 30,
        ivPercent: 25.5,
        confluenceScore: 75,
        entryPrice: 1.75,
        takeProfit: 0.85,
        stopLoss: 3.0,
        status: 'open',
        screenshots: [],
      }

      vi.mocked(apiClient.createTrade).mockResolvedValueOnce(mockTrade)

      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'QQQ')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_CALL_SPREAD')
      await user.type(screen.getByLabelText(/Strike Price/i), '450.00')
      await user.type(screen.getByLabelText(/Delta/i), '0.65')
      await user.type(screen.getByLabelText(/Days to Exp/i), '30')
      await user.type(screen.getByLabelText(/IV Percent/i), '25.5')
      await user.type(screen.getByLabelText(/Confluence Score/i), '75')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '1.75')
      await user.type(screen.getByLabelText(/Take Profit/i), '0.85')
      await user.type(screen.getByLabelText(/Stop Loss/i), '3.00')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(apiClient.createTrade).toHaveBeenCalledWith(
          expect.objectContaining({
            strikePrice: 450.0,
            delta: 0.65,
            daysToExpiration: 30,
            ivPercent: 25.5,
            confluenceScore: 75,
            takeProfit: 0.85,
            stopLoss: 3.0,
          })
        )
      })
    })
  })

  describe('Form Reset & Success Message', () => {
    it('should clear form after successful submission', async () => {
      const user = userEvent.setup()
      const mockTrade: TradeEntry = {
        id: 'trade_reset',
        entryNumber: 4,
        dateEntry: new Date().toISOString(),
        symbol: 'SPY',
        strategy: 'BEAR_CALL_SPREAD',
        entryPrice: 1.5,
        status: 'open',
        screenshots: [],
      }

      vi.mocked(apiClient.createTrade).mockResolvedValueOnce(mockTrade)

      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const symbolInput = screen.getByLabelText(/Symbol \*/i) as HTMLInputElement
      const strategySelect = screen.getByLabelText(/Strategy \*/i) as HTMLSelectElement
      const entryPriceInput = screen.getByLabelText(/Entry Price \*/i) as HTMLInputElement

      await user.type(symbolInput, 'SPY')
      await user.selectOptions(strategySelect, 'BEAR_CALL_SPREAD')
      await user.type(entryPriceInput, '1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(symbolInput.value).toBe('')
        expect(strategySelect.value).toBe('')
        expect(entryPriceInput.value).toBe('')
      })
    })

    it('should show success message after submission', async () => {
      const user = userEvent.setup()
      const mockTrade: TradeEntry = {
        id: 'trade_msg123',
        entryNumber: 5,
        dateEntry: new Date().toISOString(),
        symbol: 'TSLA',
        strategy: 'IRON_CONDOR',
        entryPrice: 2.5,
        status: 'open',
        screenshots: [],
      }

      vi.mocked(apiClient.createTrade).mockResolvedValueOnce(mockTrade)

      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'TSLA')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'IRON_CONDOR')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '2.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Trade creado exitosamente/i)).toBeInTheDocument()
      })
    })

    it('should show error message on API failure', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClient.createTrade).mockRejectedValueOnce(new Error('API Error'))

      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'SPY')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_PUT_SPREAD')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Error: API Error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Pre-filled Data from ValidationResult', () => {
    it('should pre-fill form fields from validationResult prop', () => {
      const validationResult: ValidationResult = {
        confluenceScore: 85,
        targetTP: 2.0,
        targetSL: 5.0,
      }

      render(
        <TradeInputForm validationResult={validationResult} onTradeCreated={mockOnTradeCreated} />
      )

      const confluenceInput = screen.getByLabelText(/Confluence Score/i) as HTMLInputElement
      const tpInput = screen.getByLabelText(/Take Profit/i) as HTMLInputElement
      const slInput = screen.getByLabelText(/Stop Loss/i) as HTMLInputElement

      expect(confluenceInput.value).toBe('85')
      expect(tpInput.value).toBe('2')
      expect(slInput.value).toBe('5')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form labels for all inputs', () => {
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      expect(screen.getByLabelText(/Symbol \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Strategy \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Entry Price \*/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Strike Price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Delta/i)).toBeInTheDocument()
    })

    it('should be keyboard navigable through form fields', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const symbolInput = screen.getByLabelText(/Symbol \*/i)

      // Tab to first field
      symbolInput.focus()
      expect(symbolInput).toHaveFocus()

      // Tab through fields
      await user.tab()
      expect(document.activeElement).not.toBe(symbolInput)
    })

    it('should show required field indicators', () => {
      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      const symbolLabel = screen.getByLabelText(/Symbol \*/i)
      const strategyLabel = screen.getByLabelText(/Strategy \*/i)
      const entryLabel = screen.getByLabelText(/Entry Price \*/i)

      expect(symbolLabel).toBeInTheDocument()
      expect(strategyLabel).toBeInTheDocument()
      expect(entryLabel).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('should disable submit button during submission', async () => {
      const user = userEvent.setup()

      // Mock slow API call
      vi.mocked(apiClient.createTrade).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  id: 'trade_slow',
                  entryNumber: 6,
                  dateEntry: new Date().toISOString(),
                  symbol: 'SPY',
                  strategy: 'BULL_PUT_SPREAD',
                  entryPrice: 1.5,
                  status: 'open',
                  screenshots: [],
                } as TradeEntry),
              100
            )
          })
      )

      render(<TradeInputForm onTradeCreated={mockOnTradeCreated} />)

      await user.type(screen.getByLabelText(/Symbol \*/i), 'SPY')
      await user.selectOptions(screen.getByLabelText(/Strategy \*/i), 'BULL_PUT_SPREAD')
      await user.type(screen.getByLabelText(/Entry Price \*/i), '1.50')

      const submitButton = screen.getByRole('button', { name: /Guardar Trade/i }) as HTMLButtonElement
      expect(submitButton.disabled).toBe(false)

      await user.click(submitButton)

      // Button should show loading state (disabled + different text)
      expect(submitButton.textContent).toContain('Guardando')

      await waitFor(() => {
        expect(submitButton.disabled).toBe(false)
        expect(submitButton.textContent).toContain('Guardar Trade')
      })
    })
  })
})
