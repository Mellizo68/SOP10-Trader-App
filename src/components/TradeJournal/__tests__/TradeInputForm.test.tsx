import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TradeInputForm } from '../TradeInputForm'

/**
 * Phase 6: Testing & Quality - Frontend Component Tests
 *
 * Tests TradeInputForm component for:
 * - Form submission and validation
 * - API integration
 * - User interactions
 * - Error handling
 */

describe('TradeInputForm Component', () => {
  const mockOnCreateTradeEntry = vi.fn()

  beforeEach(() => {
    mockOnCreateTradeEntry.mockClear()
  })

  describe('Form Rendering', () => {
    it('should render the form with all required fields', () => {
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/entry price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/exit price/i)).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should render optional fields', () => {
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      // Optional fields like delta, IV, GEX status
      const deltaInput = screen.queryByLabelText(/delta/i)
      const ivInput = screen.queryByLabelText(/iv|volatility/i)

      // At least one optional field should be present
      expect(deltaInput || ivInput).toBeTruthy()
    })
  })

  describe('Form Submission', () => {
    it('should call API on form submission with valid data', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const symbolInput = screen.getByLabelText(/symbol/i)
      const strategyInput = screen.getByLabelText(/strategy/i)
      const entryInput = screen.getByLabelText(/entry price/i)
      const exitInput = screen.getByLabelText(/exit price/i)

      await user.type(symbolInput, 'SPY')
      await user.type(strategyInput, 'Support Bounce')
      await user.type(entryInput, '100')
      await user.type(exitInput, '110')

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      // Should trigger API call or onCreateTradeEntry
      await waitFor(() => {
        expect(mockOnCreateTradeEntry).toHaveBeenCalled()
      })
    })

    it('should not submit form with missing required fields', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      // Should show validation error or not submit
      await waitFor(() => {
        expect(mockOnCreateTradeEntry).not.toHaveBeenCalled()
      })
    })

    it('should validate symbol is uppercase', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const symbolInput = screen.getByLabelText(/symbol/i) as HTMLInputElement
      await user.type(symbolInput, 'spy')

      // Symbol should be converted to uppercase or show error
      expect(symbolInput.value.toUpperCase() === symbolInput.value || symbolInput.value === '').toBeTruthy()
    })

    it('should validate entry_price is numeric', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const entryInput = screen.getByLabelText(/entry price/i)
      await user.type(entryInput, 'not-a-number')

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      expect(mockOnCreateTradeEntry).not.toHaveBeenCalled()
    })

    it('should validate exit_price is numeric', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const exitInput = screen.getByLabelText(/exit price/i)
      await user.type(exitInput, 'invalid')

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      expect(mockOnCreateTradeEntry).not.toHaveBeenCalled()
    })
  })

  describe('Form Field Interactions', () => {
    it('should clear form after successful submission', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const symbolInput = screen.getByLabelText(/symbol/i) as HTMLInputElement
      const strategyInput = screen.getByLabelText(/strategy/i) as HTMLInputElement
      const entryInput = screen.getByLabelText(/entry price/i) as HTMLInputElement
      const exitInput = screen.getByLabelText(/exit price/i) as HTMLInputElement

      await user.type(symbolInput, 'SPY')
      await user.type(strategyInput, 'Support Bounce')
      await user.type(entryInput, '100')
      await user.type(exitInput, '110')

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      // After successful submission, form should be cleared
      await waitFor(() => {
        expect(symbolInput.value).toBe('')
        expect(strategyInput.value).toBe('')
        expect(entryInput.value).toBe('')
        expect(exitInput.value).toBe('')
      })
    })

    it('should accept decimal prices', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const entryInput = screen.getByLabelText(/entry price/i) as HTMLInputElement
      await user.type(entryInput, '100.50')

      expect(entryInput.value).toBe('100.50')
    })

    it('should handle empty optional fields', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const symbolInput = screen.getByLabelText(/symbol/i)
      const strategyInput = screen.getByLabelText(/strategy/i)
      const entryInput = screen.getByLabelText(/entry price/i)
      const exitInput = screen.getByLabelText(/exit price/i)

      await user.type(symbolInput, 'SPY')
      await user.type(strategyInput, 'Support Bounce')
      await user.type(entryInput, '100')
      await user.type(exitInput, '110')
      // Leave optional fields empty

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnCreateTradeEntry).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error message on API failure', async () => {
      const mockError = new Error('API Error')
      const errorMockOnCreate = vi.fn().mockRejectedValueOnce(mockError)

      render(<TradeInputForm onCreateTradeEntry={errorMockOnCreate} />)

      const symbolInput = screen.getByLabelText(/symbol/i)
      const strategyInput = screen.getByLabelText(/strategy/i)
      const entryInput = screen.getByLabelText(/entry price/i)
      const exitInput = screen.getByLabelText(/exit price/i)

      const user = userEvent.setup()
      await user.type(symbolInput, 'SPY')
      await user.type(strategyInput, 'Support Bounce')
      await user.type(entryInput, '100')
      await user.type(exitInput, '110')

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      // Should display error message
      await waitFor(() => {
        expect(screen.queryByText(/error|failed/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      const slowMock = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 100)
          })
      )

      render(<TradeInputForm onCreateTradeEntry={slowMock} />)

      const symbolInput = screen.getByLabelText(/symbol/i)
      const strategyInput = screen.getByLabelText(/strategy/i)
      const entryInput = screen.getByLabelText(/entry price/i)
      const exitInput = screen.getByLabelText(/exit price/i)

      const user = userEvent.setup()
      await user.type(symbolInput, 'SPY')
      await user.type(strategyInput, 'Support Bounce')
      await user.type(entryInput, '100')
      await user.type(exitInput, '110')

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      // Should show loading indicator
      expect(screen.queryByText(/loading|submitting/i)).toBeTruthy()
    })
  })

  describe('Pre-filled Data', () => {
    it('should pre-fill form with validation result data', () => {
      const validationData = {
        symbol: 'AAPL',
        strategy: 'Technical Setup',
        strike_price: 150.0,
        delta: 0.65,
        days_to_expiration: 30,
        iv_percent: 25.5,
        gex_status: 'bullish',
      }

      render(
        <TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} initialData={validationData} />
      )

      expect((screen.getByLabelText(/symbol/i) as HTMLInputElement).value).toBe('AAPL')
      expect((screen.getByLabelText(/strategy/i) as HTMLInputElement).value).toBe('Technical Setup')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/entry price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/exit price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/strategy/i)).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const symbolInput = screen.getByLabelText(/symbol/i)

      // Tab to first field
      await user.tab()
      expect(symbolInput).toHaveFocus()

      // Tab through fields
      await user.tab()
      const nextElement = document.activeElement
      expect(nextElement).not.toBe(symbolInput)
    })

    it('should show field error messages accessibly', async () => {
      const user = userEvent.setup()
      render(<TradeInputForm onCreateTradeEntry={mockOnCreateTradeEntry} />)

      const submitButton = screen.getByRole('button', { name: /submit|create|add/i })
      await user.click(submitButton)

      // Error messages should be associated with fields
      const errorMessages = screen.queryAllByText(/required|invalid|error/i)
      expect(errorMessages.length).toBeGreaterThan(0)
    })
  })
})
