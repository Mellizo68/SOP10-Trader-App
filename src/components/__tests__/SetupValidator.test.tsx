import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SetupValidator from '../SetupValidator'
import { SetupValidatorService } from '../../services/setupValidator'
import type { ValidationResult } from '../../types'

// Mock the SetupValidatorService
vi.mock('../../services/setupValidator', () => ({
  SetupValidatorService: {
    validateSetup: vi.fn(),
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="check-circle" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
}))

describe('SetupValidator Component', () => {
  const mockValidation: ValidationResult = {
    confluenceScore: 85,
    isValidSetup: true,
    checks: {
      ivCheck: true,
      gammaCheck: true,
      cvdCheck: true,
      priceConfluenceCheck: true,
      trendCheck: true,
      dteCheck: true,
      deltaCheck: true,
    },
    recommendation: 'Setup is high quality',
    alternatives: [
      {
        strategy: 'BULL_CALL_SPREAD',
        reason: 'Good risk/reward ratio',
        trendCompatibility: 85,
      },
    ],
    targetEntry: 410,
    targetTP: 200,
    targetSL: 100,
    warnings: [],
    notes: ['Setup is high quality', 'Good risk/reward ratio'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(SetupValidatorService.validateSetup).mockReturnValue(mockValidation)
  })

  describe('Component Rendering', () => {
    it('should render the component header', () => {
      render(<SetupValidator />)

      // Emoji and text are in separate spans, so use partial match
      expect(screen.getByText(/SOP10 Setup Validator/i)).toBeInTheDocument()
      expect(screen.getByText(/Validación profesional de setups de opciones/i)).toBeInTheDocument()
    })

    it('should render all tab buttons', () => {
      render(<SetupValidator />)

      expect(screen.getByRole('button', { name: /GEX/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /PRICE/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /VOL/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /OPTIONS/i })).toBeInTheDocument()
    })

    it('should show GEX tab by default', () => {
      render(<SetupValidator />)

      expect(screen.getByText('🔧 GEX & GAMMA')).toBeInTheDocument()
    })

    it('should render analyze button', () => {
      render(<SetupValidator />)

      expect(screen.getByRole('button', { name: /ANALIZAR SETUP/i })).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to Price Action tab when clicked', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const priceTab = screen.getByRole('button', { name: /PRICE/i })
      await user.click(priceTab)

      expect(screen.getByText('💹 PRICE ACTION')).toBeInTheDocument()
      expect(screen.queryByText('🔧 GEX & GAMMA')).not.toBeInTheDocument()
    })

    it('should switch to Volatility tab when clicked', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const volTab = screen.getByRole('button', { name: /VOL/i })
      await user.click(volTab)

      expect(screen.getByText('📈 VOLATILITY & CVD')).toBeInTheDocument()
    })

    it('should switch to Options tab when clicked', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const optionsTab = screen.getByRole('button', { name: /OPTIONS/i })
      await user.click(optionsTab)

      expect(screen.getByText('⚙️ OPTIONS')).toBeInTheDocument()
    })

    it('should highlight active tab', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const gexTab = screen.getByRole('button', { name: /GEX/i })
      expect(gexTab).toHaveClass('bg-blue-600')

      const priceTab = screen.getByRole('button', { name: /PRICE/i })
      await user.click(priceTab)

      expect(priceTab).toHaveClass('bg-blue-600')
      expect(gexTab).not.toHaveClass('bg-blue-600')
    })
  })

  describe('GEX Tab Input Handling', () => {
    it('should render GEX tab with call walls section', () => {
      render(<SetupValidator />)

      expect(screen.getByText('📈 CALL WALLS (Resistencia)')).toBeInTheDocument()
      // Check that spinbutton inputs exist by querying all of them
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThanOrEqual(3)
    })

    it('should render GEX tab with put walls section', () => {
      render(<SetupValidator />)

      expect(screen.getByText('📉 PUT WALLS (Soporte)')).toBeInTheDocument()
      // Check that spinbutton inputs exist
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThanOrEqual(6)
    })

    it('should render net GEX and gamma positive inputs', () => {
      render(<SetupValidator />)

      // Check for section headers to verify elements exist
      expect(screen.getByText(/GEX & GAMMA/i)).toBeInTheDocument()
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('should update call wall input on change', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      // First spinbutton is C1
      const inputs = screen.getAllByRole('spinbutton')
      const c1Input = inputs[0] as HTMLInputElement
      await user.clear(c1Input)
      await user.type(c1Input, '115.50')

      expect(c1Input.value).toBe('115.5')
    })

    it('should update put wall input on change', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      // Fifth spinbutton is P1
      const inputs = screen.getAllByRole('spinbutton')
      const p1Input = inputs[4] as HTMLInputElement
      await user.clear(p1Input)
      await user.type(p1Input, '95.00')

      expect(p1Input.value).toBe('95')
    })

    it('should handle net GEX input', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      // Seventh spinbutton is Net GEX
      const inputs = screen.getAllByRole('spinbutton')
      const gexInput = inputs[6] as HTMLInputElement
      await user.clear(gexInput)
      await user.type(gexInput, '500')

      expect(gexInput.value).toBe('500')
    })

    it('should toggle Gamma Positivo checkbox', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      // Find checkbox by looking for checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      const gammaCheckbox = checkboxes[0] as HTMLInputElement
      expect(gammaCheckbox.checked).toBe(false)

      await user.click(gammaCheckbox)
      expect(gammaCheckbox.checked).toBe(true)
    })
  })

  describe('Price Action Tab Input Handling', () => {
    beforeEach(async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()
      const priceTab = screen.getByRole('button', { name: /PRICE/i })
      await user.click(priceTab)
    })

    it('should render price action inputs', () => {
      expect(screen.getByText('💹 PRICE ACTION')).toBeInTheDocument()
      // Verify spinbutton inputs exist
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThanOrEqual(4)
    })

    it('should update current price input', async () => {
      const user = userEvent.setup()
      const inputs = screen.getAllByRole('spinbutton')
      const priceInput = inputs[0] as HTMLInputElement

      await user.clear(priceInput)
      await user.type(priceInput, '420.50')

      expect(priceInput.value).toBe('420.5')
    })

    it('should update EMA and SMA inputs', async () => {
      const user = userEvent.setup()
      const inputs = screen.getAllByRole('spinbutton')
      // EMA21 is typically at index 2, SMA200 at index 3
      const emaInput = inputs[2] as HTMLInputElement
      const smaInput = inputs[3] as HTMLInputElement

      await user.clear(emaInput)
      await user.type(emaInput, '415.00')
      expect(emaInput.value).toBe('415')

      await user.clear(smaInput)
      await user.type(smaInput, '400.00')
      expect(smaInput.value).toBe('400')
    })
  })

  describe('Volatility Tab Input Handling', () => {
    beforeEach(async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()
      const volTab = screen.getByRole('button', { name: /VOL/i })
      await user.click(volTab)
    })

    it('should render volatility inputs', () => {
      expect(screen.getByText('📈 VOLATILITY & CVD')).toBeInTheDocument()
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThanOrEqual(3)
    })

    it('should update IV percent input', async () => {
      const user = userEvent.setup()
      const inputs = screen.getAllByRole('spinbutton')
      const ivInput = inputs[0] as HTMLInputElement

      await user.clear(ivInput)
      await user.type(ivInput, '35.5')

      expect(ivInput.value).toBe('35.5')
    })

    it('should update CVD inputs', async () => {
      const user = userEvent.setup()
      const inputs = screen.getAllByRole('spinbutton')
      const cvdValueInput = inputs[1] as HTMLInputElement

      await user.clear(cvdValueInput)
      await user.type(cvdValueInput, '1500')

      expect(cvdValueInput.value).toBe('1500')
    })

    it('should render institutional volume checkbox', () => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('should render Z-Score section', () => {
      expect(screen.getByText('⚡ INSTITUTIONAL ACTIVITY (Z-Score)')).toBeInTheDocument()
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Options Tab Input Handling', () => {
    beforeEach(async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()
      const optionsTab = screen.getByRole('button', { name: /OPTIONS/i })
      await user.click(optionsTab)
    })

    it('should render options inputs', () => {
      expect(screen.getByText('⚙️ OPTIONS')).toBeInTheDocument()
      // Check for text inputs and spinbuttons
      const textInputs = screen.getAllByRole('textbox')
      const numInputs = screen.getAllByRole('spinbutton')
      expect(textInputs.length + numInputs.length).toBeGreaterThanOrEqual(4)
    })

    it('should update symbol input', async () => {
      const user = userEvent.setup()
      const textInputs = screen.getAllByRole('textbox')
      const symbolInput = textInputs[0] as HTMLInputElement

      await user.clear(symbolInput)
      await user.type(symbolInput, 'QQQ')

      expect(symbolInput.value).toBe('QQQ')
    })

    it('should update strike price input', async () => {
      const user = userEvent.setup()
      const numInputs = screen.getAllByRole('spinbutton')
      const strikeInput = numInputs[0] as HTMLInputElement

      await user.clear(strikeInput)
      await user.type(strikeInput, '425.00')

      expect(strikeInput.value).toBe('425')
    })

    it('should update delta input', async () => {
      const user = userEvent.setup()
      const numInputs = screen.getAllByRole('spinbutton')
      // Delta is typically at index 1
      const deltaInput = numInputs[1] as HTMLInputElement

      await user.clear(deltaInput)
      await user.type(deltaInput, '-0.35')

      expect(deltaInput.value).toBe('-0.35')
    })

    it('should update DTE input', async () => {
      const user = userEvent.setup()
      const numInputs = screen.getAllByRole('spinbutton')
      // DTE is typically at index 3 or later
      const dteInput = numInputs[numInputs.length - 1] as HTMLInputElement

      await user.clear(dteInput)
      await user.type(dteInput, '30')

      expect(dteInput.value).toBe('30')
    })

    it('should select strategy from dropdown', async () => {
      const user = userEvent.setup()
      const selects = screen.getAllByRole('combobox')
      const strategySelect = selects[0] as HTMLSelectElement

      await user.selectOptions(strategySelect, 'BULL_CALL_SPREAD')
      expect(strategySelect.value).toBe('BULL_CALL_SPREAD')
    })

    it('should select option type from dropdown', async () => {
      const user = userEvent.setup()
      const selects = screen.getAllByRole('combobox')
      // Option Type is typically the second select
      const typeSelect = selects[selects.length - 1] as HTMLSelectElement

      await user.selectOptions(typeSelect, 'call')
      expect(typeSelect.value).toBe('call')
    })
  })

  describe('Setup Validation and Results', () => {
    it('should call validateSetup when analyze button is clicked', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(SetupValidatorService.validateSetup).toHaveBeenCalled()
    })

    it('should display confluence score badge after validation', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText('CONFLUENCE SCORE')).toBeInTheDocument()
      expect(screen.getByText('85/100 ✓')).toBeInTheDocument()
    })

    it('should show valid setup indicator when isValidSetup is true', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText('✅ SETUP VÁLIDO')).toBeInTheDocument()
    })

    it('should show invalid setup indicator when isValidSetup is false', async () => {
      vi.mocked(SetupValidatorService.validateSetup).mockReturnValue({
        ...mockValidation,
        isValidSetup: false,
      })

      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText('❌ SETUP INVÁLIDO')).toBeInTheDocument()
    })

    it('should display recommendation text', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      // The text appears multiple times, so check that at least one exists
      const recommendationTexts = screen.getAllByText('Setup is high quality')
      expect(recommendationTexts.length).toBeGreaterThan(0)
    })

    it('should display validation checks', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText('VALIDACIÓN')).toBeInTheDocument()
      // Check for at least one check icon
      const checkCircles = screen.getAllByTestId('check-circle')
      expect(checkCircles.length).toBeGreaterThan(0)
    })

    it('should display target entry, TP, and SL', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText('$410.00')).toBeInTheDocument()
      expect(screen.getByText('$200.00')).toBeInTheDocument()
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })

    it('should display alternatives when present', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText(/ALTERNATIVAS/i)).toBeInTheDocument()
      expect(screen.getByText('BULL_CALL_SPREAD')).toBeInTheDocument()
    })

    it('should display warnings when present', async () => {
      const validationWithWarnings: ValidationResult = {
        ...mockValidation,
        warnings: ['Warning 1', 'Warning 2'],
      }
      vi.mocked(SetupValidatorService.validateSetup).mockReturnValue(validationWithWarnings)

      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText('⚠️ ADVERTENCIAS')).toBeInTheDocument()
      expect(screen.getByText('Warning 1')).toBeInTheDocument()
    })

    it('should display notes when present', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(screen.getByText('📝 NOTAS')).toBeInTheDocument()
    })
  })

  describe('Confluence Score Coloring', () => {
    it('should show green badge for high confluence score (>= 80)', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      const scoreElement = screen.getByText('85/100 ✓')
      expect(scoreElement).toHaveClass('bg-green-500')
    })

    it('should show yellow badge for medium confluence score (65-79)', async () => {
      vi.mocked(SetupValidatorService.validateSetup).mockReturnValue({
        ...mockValidation,
        confluenceScore: 72,
      })

      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      const scoreElement = screen.getByText('72/100 ✓')
      expect(scoreElement).toHaveClass('bg-yellow-500')
    })

    it('should show red badge for low confluence score (< 65)', async () => {
      vi.mocked(SetupValidatorService.validateSetup).mockReturnValue({
        ...mockValidation,
        confluenceScore: 50,
      })

      render(<SetupValidator />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      const scoreElement = screen.getByText('50/100 ✓')
      expect(scoreElement).toHaveClass('bg-red-500')
    })
  })

  describe('Callbacks', () => {
    it('should call onValidationResult callback when validation is performed', async () => {
      const onValidationResult = vi.fn()
      render(<SetupValidator onValidationResult={onValidationResult} />)
      const user = userEvent.setup()

      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      expect(onValidationResult).toHaveBeenCalledWith(mockValidation)
    })

    it('should call onCreateTradeEntry when create trade entry button is clicked', async () => {
      const onCreateTradeEntry = vi.fn()
      render(<SetupValidator onCreateTradeEntry={onCreateTradeEntry} />)
      const user = userEvent.setup()

      // First validate to show results
      const analyzeButton = screen.getByRole('button', { name: /ANALIZAR SETUP/i })
      await user.click(analyzeButton)

      // Then click create trade entry
      const createTradeButton = screen.getByRole('button', { name: /Crear Trade Entry/i })
      await user.click(createTradeButton)

      expect(onCreateTradeEntry).toHaveBeenCalled()
    })
  })

  describe('Form Persistence', () => {
    it('should persist form data when switching tabs', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      // Enter data in GEX tab - find input by placeholder
      const inputs = screen.getAllByRole('spinbutton')
      const c1Input = inputs[0] as HTMLInputElement
      await user.clear(c1Input)
      await user.type(c1Input, '120')

      // Switch to Price tab
      const priceTab = screen.getByRole('button', { name: /PRICE/i })
      await user.click(priceTab)

      // Switch back to GEX tab
      const gexTab = screen.getByRole('button', { name: /GEX/i })
      await user.click(gexTab)

      // Data should persist
      const inputsAfter = screen.getAllByRole('spinbutton')
      const c1InputAfter = inputsAfter[0] as HTMLInputElement
      expect(c1InputAfter.value).toBe('120')
    })
  })

  describe('Initial Data Loading', () => {
    it('should load and display initial data if provided', () => {
      const initialData = {
        gexData: {
          callWall1: 112.5,
          callWall2: 115,
          callWall3: 117.5,
          putWall1: 98.5,
          putWall2: 96,
          putWall3: 93.5,
          netGEX: 577.6,
          gammaFlip: false,
          gammaPositive: true,
        },
        priceAction: {
          currentPrice: 420.5,
          vwapMonth: 415,
          avwapHigh: 425,
          avwapLow: 415,
          avwapMonth: 418,
          pocMonth: 419,
          apvpHigh: 426,
          apvpLow: 414,
          ema21: 418,
          sma200: 410,
        },
        volatilityCVD: {
          ivPercent: 35.5,
          cvdValue: 1500,
          cvdEMA: 1400,
          cvdDelta: 100,
          cvdDivergence: 'none' as const,
          cvdDivergenceStrength: 'weak' as const,
          institutionalVolume: false,
        },
        options: {
          symbol: 'SPY',
          strategy: 'BULL_PUT_SPREAD',
          strikePrice: 415,
          delta: -0.35,
          gamma: 0.002,
          vega: 0.5,
          theta: 0.05,
          daysToExpiration: 30,
          optionType: 'put' as const,
        },
        timestamp: new Date(),
        screenshots: {},
        comments: '',
      }

      render(<SetupValidator initialData={initialData} />)

      // Check that data is displayed - look for the specific value in an input
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.some(input => input.value === '112.5')).toBe(true)
    })

    it('should auto-validate when initial data is provided', async () => {
      const initialData = {
        gexData: {
          callWall1: 112.5,
          callWall2: 115,
          callWall3: 117.5,
          putWall1: 98.5,
          putWall2: 96,
          putWall3: 93.5,
          netGEX: 577.6,
          gammaFlip: false,
          gammaPositive: true,
        },
        priceAction: {
          currentPrice: 420.5,
          vwapMonth: 415,
          avwapHigh: 425,
          avwapLow: 415,
          avwapMonth: 418,
          pocMonth: 419,
          apvpHigh: 426,
          apvpLow: 414,
          ema21: 418,
          sma200: 410,
        },
        volatilityCVD: {
          ivPercent: 35.5,
          cvdValue: 1500,
          cvdEMA: 1400,
          cvdDelta: 100,
          cvdDivergence: 'none' as const,
          cvdDivergenceStrength: 'weak' as const,
          institutionalVolume: false,
        },
        options: {
          symbol: 'SPY',
          strategy: 'BULL_PUT_SPREAD',
          strikePrice: 415,
          delta: -0.35,
          gamma: 0.002,
          vega: 0.5,
          theta: 0.05,
          daysToExpiration: 30,
          optionType: 'put' as const,
        },
        timestamp: new Date(),
        screenshots: {},
        comments: '',
      }

      render(<SetupValidator initialData={initialData} />)

      // Wait for validation result to appear
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should show validation results without clicking analyze button
      expect(screen.getByText('CONFLUENCE SCORE')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have descriptive button labels', () => {
      render(<SetupValidator />)

      expect(screen.getByRole('button', { name: /GEX/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ANALIZAR/i })).toBeInTheDocument()
    })

    it('should support tab navigation through buttons', async () => {
      render(<SetupValidator />)
      const user = userEvent.setup()

      const gexTab = screen.getByRole('button', { name: /GEX/i })
      gexTab.focus()

      expect(gexTab).toHaveFocus()

      await user.keyboard('{Tab}')
      expect(screen.getByRole('button', { name: /PRICE/i })).toHaveFocus()
    })
  })
})
