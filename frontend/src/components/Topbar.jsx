import {
  ChevronRight, Home, RefreshCw, LayoutGrid, List,
  FilePlus, FolderPlus, Upload, ArrowUp,
  SortAsc, SortDesc, ChevronDown,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'

export default function Topbar({ onNewFile, onNewFolder, onRefresh, loading }) {
  const {
    currentPath, navigateTo, navigateUp, breadcrumbs,
    viewMode, setViewMode,
    sortBy, setSortBy, sortDir, setSortDir,
    notify, refresh,
  } = useApp()

  const [showSort, setShowSort] = useState(false)
  const uploadRef = useRef(null)

  const SORT_OPTIONS = [
    { key: 'name',  label: 'Name'     },
    { key: 'size',  label: 'Size'     },
    { key: 'mtime', label: 'Modified' },
    { key: 'type',  label: 'Type'     },
  ]

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      await api.uploadFile(file, currentPath)
      notify(`Uploaded: ${file.name}`, 'success')
      refresh()
    } catch (err) {
      notify(`Upload failed: ${err.message}`, 'error')
    }
    e.target.value = ''
  }

  return (
    <header className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200
                       dark:border-gray-800 bg-white dark:bg-gray-950">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-0.5 min-w-0">
            {i > 0 && <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
            <button
              onClick={() => navigateTo(crumb.path)}
              className={`text-sm px-1.5 py-0.5 rounded-md truncate transition-colors
                ${i === breadcrumbs.length - 1
                  ? 'font-semibold text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {i === 0 ? <Home size={14} className="inline -mt-0.5 mr-1" /> : null}
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Up */}
        <button
          onClick={navigateUp}
          disabled={!currentPath}
          className="btn-ghost px-2 py-1.5 disabled:opacity-30"
          title="Go up"
        >
          <ArrowUp size={16} />
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className={`btn-ghost px-2 py-1.5 ${loading ? 'opacity-50' : ''}`}
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSort(s => !s)}
            className="btn-ghost px-2 py-1.5 gap-1"
            title="Sort"
          >
            {sortDir === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
            <span className="hidden sm:inline text-xs">{SORT_OPTIONS.find(s => s.key === sortBy)?.label}</span>
            <ChevronDown size={12} />
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-gray-200
                            dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-20 py-1
                            animate-fade-in">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                    else { setSortBy(key); setSortDir('asc') }
                    setShowSort(false)
                  }}
                  className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                    ${sortBy === key ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {label}
                  {sortBy === key && (sortDir === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1.5 ${viewMode === 'grid'
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
              : 'bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            } transition-colors`}
            title="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1.5 border-l border-gray-200 dark:border-gray-700 ${viewMode === 'list'
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
              : 'bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            } transition-colors`}
            title="List view"
          >
            <List size={15} />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />

        {/* Create buttons */}
        <button onClick={onNewFile} className="btn-ghost px-2 py-1.5" title="New File">
          <FilePlus size={16} />
          <span className="hidden lg:inline text-xs">File</span>
        </button>
        <button onClick={onNewFolder} className="btn-ghost px-2 py-1.5" title="New Folder">
          <FolderPlus size={16} />
          <span className="hidden lg:inline text-xs">Folder</span>
        </button>

        {/* Upload */}
        <button
          onClick={() => uploadRef.current?.click()}
          className="btn-primary px-3 py-1.5"
          title="Upload file"
        >
          <Upload size={15} />
          <span className="hidden sm:inline text-xs">Upload</span>
        </button>
        <input ref={uploadRef} type="file" className="hidden" onChange={handleUpload} />
      </div>
    </header>
  )
}
