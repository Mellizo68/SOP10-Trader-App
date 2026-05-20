import { useState } from 'react'
import SetupValidator from './components/SetupValidator'
import ExitCalculator from './components/ExitCalculator'
import ImageExtractor from './components/ImageExtractor'
import { SetupValidation } from './types'
import './styles/App.css'

function App() {
  const [activeModule, setActiveModule] = useState<'validator' | 'calculator' | 'extractor'>('extractor')
  const [validatorData, setValidatorData] = useState<SetupValidation | null>(null)

  const handleExtractComplete = (data: SetupValidation) => {
    setValidatorData(data)
    setActiveModule('validator')
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
        </div>
      </div>

      {/* Content */}
      <div>
        {activeModule === 'extractor' && <ImageExtractor onExtractComplete={handleExtractComplete} />}
        {activeModule === 'validator' && <SetupValidator initialData={validatorData || undefined} />}
        {activeModule === 'calculator' && <ExitCalculator />}
      </div>
    </div>
  )
}

export default App
