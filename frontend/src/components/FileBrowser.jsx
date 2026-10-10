import { useRef } from 'react'
import { useApp } from '../context/AppContext'
import { FileIcon, formatSize, formatDate, isImageFile } from '../utils/fileUtils'
import {
  Folder, Star,
} from 'lucide-react'

/* ── Grid item ────────────────────────────────────────────── */
function GridItem({ entry, selected, onClick, onDoubleClick, onContextMenu }) {
  const { isStarred } = useApp()
  const starred = isStarred(entry.path)
  const isImage = isImageFile(entry.name)

  return (
    <div
      className={`file-grid-item group relative ${selected ? 'selected' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
    >
      {/* Star indicator */}
      {starred && (
        <span className="absolute top-1.5 right-1.5 text-yellow-500 z-10" title="Starred">
          <Star size={12} className="fill-yellow-500" />
        </span>
      )}

      {/* Icon or Image thumbnail */}
      <div className="relative flex items-center justify-center w-12 h-12 my-1">
        {isImage ? (
          <img
            src={`/api/files/raw?path=${encodeURIComponent(entry.path)}`}
            alt={entry.name}
            className="w-12 h-12 object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div style={{ display: isImage ? 'none' : 'flex' }} className="items-center justify-center">
          <FileIcon entry={entry} size={40} />
        </div>
        {entry.isDir && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-100
                           dark:bg-amber-900/40 flex items-center justify-center">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">D</span>
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center
                    max-w-[88px] truncate leading-tight mt-0.5"
         title={entry.name}>
        {entry.name}
      </p>

      {/* Meta */}
      <p className="text-[10px] text-gray-400 dark:text-gray-600">
        {entry.isDir ? 'Folder' : formatSize(entry.size)}
      </p>
    </div>
  )
}

/* ── List item ────────────────────────────────────────────── */
function ListItem({ entry, selected, onClick, onDoubleClick, onContextMenu }) {
  const { isStarred } = useApp()
  const starred = isStarred(entry.path)
  const isImage = isImageFile(entry.name)

  return (
    <div
      className={`file-list-row group ${selected ? 'selected' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {starred ? (
          <Star size={13} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
        ) : (
          <span className="w-[13px]" />
        )}
        {isImage ? (
          <img
            src={`/api/files/raw?path=${encodeURIComponent(entry.path)}`}
            alt={entry.name}
            className="w-5 h-5 object-cover rounded shadow-sm border border-gray-200 dark:border-gray-700 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) fallback.style.display = 'inline-block';
            }}
          />
        ) : null}
        <div style={{ display: isImage ? 'none' : 'inline-block' }}>
          <FileIcon entry={entry} size={18} />
        </div>
      </div>

      <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-200
                       truncate"
            title={entry.name}>
        {entry.name}
      </span>

      <span className="w-28 text-xs text-gray-400 dark:text-gray-600 text-right hidden sm:block">
        {entry.isDir ? '—' : formatSize(entry.size)}
      </span>
      <span className="w-36 text-xs text-gray-400 dark:text-gray-600 text-right hidden md:block">
        {formatDate(entry.mtime)}
      </span>
      <span className="w-28 text-xs font-mono text-gray-400 dark:text-gray-600 text-right hidden lg:block">
        {entry.permissions || '—'}
      </span>
    </div>
  )
}

/* ── Main FileBrowser ────────────────────────────────────── */
export default function FileBrowser({ entries, loading, onOpenEntry, onContextMenu }) {
  const { viewMode, selectedItems, setSelectedItems, sortEntries } = useApp()
  const containerRef = useRef(null)

  const sorted = sortEntries(entries || [])

  function handleItemClick(e, entry) {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      setSelectedItems(sel =>
        sel.some(s => s.path === entry.path)
          ? sel.filter(s => s.path !== entry.path)
          : [...sel, entry]
      )
    } else {
      setSelectedItems([entry])
    }
  }

  function handleDoubleClick(entry) {
    onOpenEntry(entry)
  }

  function handleContextMenu(e, entry) {
    e.preventDefault()
    e.stopPropagation()
    if (!selectedItems.some(s => s.path === entry.path)) {
      setSelectedItems([entry])
    }
    onContextMenu(e, entry)
  }

  /* Loading skeleton */
  if (loading) {
    return (
      <div className={`p-4 ${viewMode === 'grid'
        ? 'grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-3'
        : 'space-y-1'}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          viewMode === 'grid'
            ? <div key={i} className="skeleton h-24 rounded-xl" />
            : <div key={i} className="skeleton h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  /* Empty state */
  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
        <Folder size={48} className="text-gray-200 dark:text-gray-800" />
        <p className="text-gray-400 dark:text-gray-600 text-sm">This folder is empty</p>
        <p className="text-gray-300 dark:text-gray-700 text-xs">
          Create a file or folder to get started
        </p>
      </div>
    )
  }

  /* List header */
  const ListHeader = () => (
    <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold
                    text-gray-400 dark:text-gray-600 uppercase tracking-wider
                    border-b border-gray-100 dark:border-gray-800">
      <span className="w-5"></span>
      <span className="flex-1">Name</span>
      <span className="w-28 text-right hidden sm:block">Size</span>
      <span className="w-36 text-right hidden md:block">Modified</span>
      <span className="w-28 text-right hidden lg:block">Permissions</span>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      onClick={() => setSelectedItems([])}
    >
      {viewMode === 'grid' ? (
        <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-3">
          {sorted.map(entry => (
            <GridItem
              key={entry.path}
              entry={entry}
              selected={selectedItems.some(s => s.path === entry.path)}
              onClick={e => handleItemClick(e, entry)}
              onDoubleClick={() => handleDoubleClick(entry)}
              onContextMenu={e => handleContextMenu(e, entry)}
            />
          ))}
        </div>
      ) : (
        <div>
          <ListHeader />
          <div className="px-2 py-1.5 space-y-0.5">
            {sorted.map(entry => (
              <ListItem
                key={entry.path}
                entry={entry}
                selected={selectedItems.some(s => s.path === entry.path)}
                onClick={e => handleItemClick(e, entry)}
                onDoubleClick={() => handleDoubleClick(entry)}
                onContextMenu={e => handleContextMenu(e, entry)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
