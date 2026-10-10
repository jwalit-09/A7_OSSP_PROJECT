import { useState, useEffect, useCallback } from 'react'
import {
  X, Save, Edit3, AlertTriangle, FileText,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../context/AppContext'
import { FileIcon, formatSize, isTextFile, isImageFile } from '../utils/fileUtils'

export default function FilePreview({ entry, onClose }) {
  const { notify, refresh } = useApp()
  const [content, setContent]   = useState(null)
  const [edited, setEdited]     = useState('')
  const [isDirty, setIsDirty]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving]     = useState(false)

  const loadContent = useCallback(async () => {
    if (!entry || entry.isDir) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.content(entry.path)
      setContent(data.content)
      setEdited(data.content)
      setIsDirty(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [entry])

  useEffect(() => { loadContent() }, [loadContent])

  async function handleSave() {
    setSaving(true)
    try {
      await api.writeFile(entry.path, edited)
      setContent(edited)
      setIsDirty(false)
      setEditMode(false)
      notify(`Saved: ${entry.name}`, 'success')
      refresh()
    } catch (e) {
      notify(`Save failed: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleChange(val) {
    setEdited(val)
    setIsDirty(val !== content)
  }

  if (!entry) return null
  const isText  = isTextFile(entry.name)
  const isImage = isImageFile(entry.name)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border-l border-gray-200
                    dark:border-gray-800 w-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200
                      dark:border-gray-800 flex-shrink-0">
        <FileIcon entry={entry} size={18} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {entry.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            {formatSize(entry.size)}
            {isDirty && <span className="ml-2 text-amber-500">• Unsaved changes</span>}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {isText && !editMode && (
            <button onClick={() => setEditMode(true)} className="btn-ghost px-2 py-1">
              <Edit3 size={14} />
            </button>
          )}
          {editMode && (
            <>
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="btn-primary px-2 py-1 text-xs"
              >
                <Save size={13} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  if (isDirty && !confirm('Discard changes?')) return
                  setEdited(content)
                  setIsDirty(false)
                  setEditMode(false)
                }}
                className="btn-ghost px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </>
          )}
          <button onClick={onClose} className="btn-ghost px-2 py-1">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent
                            rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <AlertTriangle size={32} className="text-amber-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cannot preview this file
            </p>
            <p className="text-xs text-gray-400 text-center">{error}</p>
          </div>
        )}

        {!loading && !error && isImage && (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-gray-400">Image preview not available in browser context.</p>
          </div>
        )}

        {!loading && !error && isText && (
          editMode ? (
            <textarea
              className="code-editor p-4 w-full h-full"
              value={edited}
              onChange={e => handleChange(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <pre className="p-4 text-xs font-mono leading-6 text-gray-800 dark:text-gray-200
                            whitespace-pre-wrap break-words overflow-auto h-full">
              {content}
            </pre>
          )
        )}

        {!loading && !error && !isText && !isImage && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <FileIcon entry={entry} size={40} />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Binary file – no preview available
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-600">
              {entry.name} · {formatSize(entry.size)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
