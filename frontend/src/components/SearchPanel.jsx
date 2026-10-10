import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, Loader2, FolderOpen, FileText } from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../context/AppContext'
import { FileIcon, formatSize, formatDate } from '../utils/fileUtils'

export default function SearchPanel({ onClose, onOpenEntry }) {
  const { currentPath, notify } = useApp()
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    setError(null)
    try {
      const data = await api.search(q, '')  // search from workspace root
      setResults(data.results || [])
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400)
    return () => clearTimeout(t)
  }, [query, doSearch])

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl card shadow-2xl animate-slide-down overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200
                        dark:border-gray-800">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-600 outline-none"
            placeholder="Search files and folders…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="btn-ghost p-1.5 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-600">
              Type to search files and folders in your workspace
            </div>
          )}

          {query && !loading && results !== null && results.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-600">
              No files found matching "<strong>{query}</strong>"
            </div>
          )}

          {error && (
            <div className="px-5 py-4 text-sm text-red-500">{error}</div>
          )}

          {results && results.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest
                            text-gray-400 dark:text-gray-600">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </p>
              {results.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => { onOpenEntry(entry); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50
                             dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <FileIcon entry={entry} size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {entry.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 font-mono truncate">
                      {entry.path}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatSize(entry.size)}</p>
                    <p className="text-xs text-gray-300 dark:text-gray-700">
                      {formatDate(entry.mtime)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100
                        dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <span className="text-xs text-gray-400 dark:text-gray-600">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[10px]">↵</kbd>
            {' '}open  ·  <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[10px]">Esc</kbd>
            {' '}close
          </span>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">
            Powered by ShellForge find()
          </span>
        </div>
      </div>
    </div>
  )
}
