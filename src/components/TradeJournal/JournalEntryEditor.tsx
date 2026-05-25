import React, { useState, useEffect } from 'react'
import { JournalEntry } from '../../types'
import { apiClient } from '../../api/tradeClient'

interface JournalEntryEditorProps {
  tradeId: string
  journalId?: string
  sectionType: 'setup' | 'execution' | 'review' | 'lesson'
  onSave?: (entry: JournalEntry) => void
  onCancel?: () => void
  autoSave?: boolean
}

/**
 * Journal Entry Editor Component
 * Rich text editor for trade journal entries with markdown support
 */
export const JournalEntryEditor: React.FC<JournalEntryEditorProps> = ({
  tradeId,
  journalId,
  sectionType,
  onSave,
  onCancel,
  autoSave = true,
}) => {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Load existing journal entry if editing
  useEffect(() => {
    if (journalId) {
      loadJournal()
    }
  }, [journalId, tradeId])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !isDirty || !content.trim()) return

    const timer = setTimeout(() => {
      handleSave()
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer)
  }, [content, autoSave])

  const loadJournal = async () => {
    try {
      if (!journalId) return
      const journal = await apiClient.getJournal(tradeId, journalId)
      if (journal) {
        setContent(journal.content)
        setIsDirty(false)
      }
    } catch (err) {
      setError('Failed to load journal entry')
      console.error(err)
    }
  }

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Journal entry cannot be empty')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      let savedEntry: any

      if (journalId) {
        // Update existing entry
        savedEntry = await apiClient.updateJournal(tradeId, journalId, {
          content,
          section_type: sectionType,
        })
      } else {
        // Create new entry
        savedEntry = await apiClient.createJournal(tradeId, {
          content,
          section_type: sectionType,
        })
      }

      setLastSavedTime(new Date())
      setIsDirty(false)

      if (onSave) {
        onSave(savedEntry)
      }
    } catch (err) {
      setError('Failed to save journal entry')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('journal-textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end)

    setContent(newContent)
    setIsDirty(true)

    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + before.length + selectedText.length
      textarea.focus()
    }, 0)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header with section info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">
          {sectionType === 'lesson' ? 'Lessons Learned' : sectionType} Notes
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Document your {sectionType} analysis and insights for this trade
        </p>
      </div>

      {/* Markdown toolbar */}
      <div className="mb-3 p-2 bg-gray-100 rounded flex flex-wrap gap-2">
        <button
          onClick={() => insertMarkdown('**', '**')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => insertMarkdown('*', '*')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => insertMarkdown('~~', '~~')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => insertMarkdown('`', '`')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-mono text-xs"
          title="Inline Code"
        >
          code
        </button>
        <button
          onClick={() => insertMarkdown('- ')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm"
          title="Bullet List"
        >
          • List
        </button>
        <button
          onClick={() => insertMarkdown('> ')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm"
          title="Blockquote"
        >
          " Quote
        </button>
        <div className="flex-1"></div>
        <span className="text-xs text-gray-500 py-1">
          Supports Markdown formatting
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Textarea */}
      <textarea
        id="journal-textarea"
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setIsDirty(true)
          setError('')
        }}
        className="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter your journal notes in Markdown format..."
      />

      {/* Character count and auto-save status */}
      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
        <span>{content.length} characters</span>
        <span>
          {isSaving && 'Saving...'}
          {!isSaving && lastSavedTime && `Saved ${lastSavedTime.toLocaleTimeString()}`}
          {isDirty && !isSaving && ' (Unsaved changes)'}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
            disabled={isSaving}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
        >
          {isSaving ? 'Saving...' : journalId ? 'Update' : 'Save'}
        </button>
      </div>

      {/* Preview section */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Preview
          </summary>
          <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap break-words">
            {content || '(Empty)'}
          </div>
        </details>
      </div>
    </div>
  )
}

export default JournalEntryEditor
