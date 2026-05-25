import React, { useState, useEffect } from 'react'
import { JournalEntry } from '../../types'
import { apiClient } from '../../api/tradeClient'
import JournalEntryEditor from './JournalEntryEditor'

interface TradeJournalNotesProps {
  tradeId: string
  tradeSymbol: string
}

type SectionType = 'setup' | 'execution' | 'review' | 'lesson'

interface JournalSection {
  type: SectionType
  title: string
  description: string
  icon: string
  entries: JournalEntry[]
}

/**
 * Trade Journal Notes Component
 * Main interface for viewing and editing trade journal entries across 4 sections
 */
export const TradeJournalNotes: React.FC<TradeJournalNotesProps> = ({
  tradeId,
  tradeSymbol,
}) => {
  const [sections, setSections] = useState<JournalSection[]>([
    {
      type: 'setup',
      title: 'Setup',
      description: 'Document the technical setup and confluence factors',
      icon: '🔍',
      entries: [],
    },
    {
      type: 'execution',
      title: 'Execution',
      description: 'Record your execution analysis and price action observations',
      icon: '⚡',
      entries: [],
    },
    {
      type: 'review',
      title: 'Review',
      description: 'Post-trade analysis and result assessment',
      icon: '📊',
      entries: [],
    },
    {
      type: 'lesson',
      title: 'Lessons',
      description: 'Key learnings and improvements for future trades',
      icon: '💡',
      entries: [],
    },
  ])

  const [activeSection, setActiveSection] = useState<SectionType>('setup')
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Load all journal entries
  useEffect(() => {
    loadJournals()
  }, [tradeId])

  const loadJournals = async () => {
    try {
      setIsLoading(true)
      setError('')

      const updatedSections = await Promise.all(
        sections.map(async (section) => {
          const entries = await apiClient.getJournals(tradeId, 100)
          const sectionEntries = entries.filter((e: any) => e.sectionType === section.type)
          return {
            ...section,
            entries: sectionEntries,
          }
        })
      )

      setSections(updatedSections)
    } catch (err) {
      setError('Failed to load journal entries')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveEntry = async (entry: JournalEntry) => {
    // Reload all entries
    await loadJournals()
    setEditingJournalId(null)
  }

  const handleDeleteEntry = async (journalId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      await apiClient.deleteJournal(tradeId, journalId)
      await loadJournals()
    } catch (err) {
      setError('Failed to delete entry')
      console.error(err)
    }
  }

  const currentSection = sections.find((s) => s.type === activeSection)!

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Trade Journal</h2>
        <p className="text-gray-600 mt-1">
          {tradeSymbol} - Document your analysis across four phases
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Section tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {sections.map((section) => (
          <button
            key={section.type}
            onClick={() => setActiveSection(section.type)}
            className={`p-3 rounded-lg border-2 text-left transition ${
              activeSection === section.type
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-1">{section.icon}</div>
            <div className="font-semibold text-sm">{section.title}</div>
            <div className="text-xs text-gray-500 mt-1">
              {section.entries.length} {section.entries.length === 1 ? 'entry' : 'entries'}
            </div>
          </button>
        ))}
      </div>

      {/* Current section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading journal entries...</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentSection.title}</h3>
            <p className="text-gray-600 mb-4">{currentSection.description}</p>

            {/* Existing entries list */}
            {currentSection.entries.length > 0 && (
              <div className="mb-6 max-h-64 overflow-y-auto bg-gray-50 rounded p-4 border border-gray-200">
                <div className="space-y-3">
                  {currentSection.entries.map((entry: JournalEntry) => (
                    <div key={entry.id} className="bg-white p-3 rounded border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {entry.content.substring(0, 150)}
                        {entry.content.length > 150 ? '...' : ''}
                      </p>
                      <button
                        onClick={() => setEditingJournalId(entry.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor section */}
            {editingJournalId ? (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Editing Entry</h4>
                <JournalEntryEditor
                  tradeId={tradeId}
                  journalId={editingJournalId}
                  sectionType={activeSection}
                  onSave={handleSaveEntry}
                  onCancel={() => setEditingJournalId(null)}
                  autoSave={true}
                />
              </div>
            ) : (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">New Entry</h4>
                <JournalEntryEditor
                  tradeId={tradeId}
                  sectionType={activeSection}
                  onSave={handleSaveEntry}
                  autoSave={true}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-semibold text-blue-900 mb-2">Journal Summary</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Setup notes: {sections[0].entries.length}</li>
          <li>✓ Execution notes: {sections[1].entries.length}</li>
          <li>✓ Review notes: {sections[2].entries.length}</li>
          <li>✓ Lessons learned: {sections[3].entries.length}</li>
        </ul>
      </div>
    </div>
  )
}

export default TradeJournalNotes
