import { useState, useEffect } from 'react'
import SetupValidator from './components/SetupValidator'
import ExitCalculator from './components/ExitCalculator'
import ImageExtractor from './components/ImageExtractor'
import TradeJournal from './components/TradeJournal'
import { SetupValidation, ValidationResult } from './types'
import { TradeJournalService } from './services/tradeJournalService'
import './styles/App.css'

function App() {
  const [activeModule, setActiveModule] = useState<'validator' | 'calculator' | 'extractor' | 'journal'>('extractor')
  const [validatorData, setValidatorData] = useState<SetupValidation | null>(null)
  const [latestValidationResult, setLatestValidationResult] = useState<ValidationResult | null>(null)

  // Initialize API sync on app load
  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log('🔄 Initializing API sync...')
        const result = await TradeJournalService.syncPendingTrades()
        if (result.synced > 0) {
          console.log(`✅ Synced ${result.synced} trades from localStorage`)
        }
      } catch (error) {
        console.warn('API sync failed, using offline mode:', error)
      }
    }

    initializeSync()

    // Listen for when the app comes online
    const handleOnline = async () => {
      console.log('🔗 Back online - syncing pending trades...')
      await TradeJournalService.syncPendingTrades()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const handleExtractComplete = (data: SetupValidation) => {
    setValidatorData(data)
    setActiveModule('validator')
  }

  const handleValidationResult = (result: ValidationResult) => {
    setLatestValidationResult(result)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Module Selector */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
          <button
            onClick={() => setActiveModule('extractor')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeModule === 'extractor'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            📸 Image Extractor
          </button>
          <button
            onClick={() => setActiveModule('validator')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeModule === 'validator'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            🎯 Setup Validator
          </button>
          <button
            onClick={() => setActiveModule('calculator')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeModule === 'calculator'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            🧮 Exit Calculator
          </button>
          <button
            onClick={() => setActiveModule('journal')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              activeModule === 'journal'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            📓 Trade Journal
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeModule === 'extractor' && <ImageExtractor onExtractComplete={handleExtractComplete} />}
        {activeModule === 'validator' && (
          <SetupValidator
            initialData={validatorData || undefined}
            onValidationResult={handleValidationResult}
            onCreateTradeEntry={() => setActiveModule('journal')}
          />
        )}
        {activeModule === 'calculator' && <ExitCalculator />}
        {activeModule === 'journal' && <TradeJournal validationResult={latestValidationResult || undefined} />}
      </div>
    </div>
  )
}

export default App
