import { useState, useEffect, useCallback } from 'react'
import { AppProvider, useApp }  from './context/AppContext'
import Sidebar                 from './components/Sidebar'
import Topbar                  from './components/Topbar'
import FileBrowser             from './components/FileBrowser'
import FilePreview             from './components/FilePreview'
import ContextMenu             from './components/ContextMenu'
import SearchPanel             from './components/SearchPanel'
import Notifications           from './components/Notifications'
import {
  CreateModal, RenameModal, DeleteModal,
  PermissionsModal, PropertiesModal,
} from './components/Modals'
import { api }                 from './services/api'
import { joinPath, isTextFile } from './utils/fileUtils'
import { Star, Clock, FileText } from 'lucide-react'

/* ── Inner app (has access to context) ───────────────────── */
function FileManager() {
  const {
    currentPath, navigateTo, setBackendOk,
    selectedItems, setSelectedItems,
    notify, refresh, refreshKey,
    clipboard, setClipboard,
    theme, activeView, setActiveView,
    starred, isStarred, toggleStar,
    recent, addRecent,
  } = useApp()

  /* Apply theme class on <html> */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  /* ── State ─────────────────────────────────────────────── */
  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [previewFile, setPreviewFile] = useState(null)

  /* Modals */
  const [createModal,    setCreateModal]    = useState(null)
  const [renameModal,    setRenameModal]    = useState(false)
  const [deleteModal,    setDeleteModal]    = useState(false)
  const [permsModal,     setPermsModal]     = useState(false)
  const [propsModal,     setPropsModal]     = useState(false)
  const [showSearch,     setShowSearch]     = useState(false)

  /* Context menu */
  const [ctxMenu, setCtxMenu] = useState(null)

  /* Permissions data */
  const [permsData, setPermsData] = useState(null)

  /* ── Backend health check (polls every 6s if offline) ──── */
  useEffect(() => {
    function checkHealth() {
      api.health()
        .then(() => setBackendOk(true))
        .catch(() => setBackendOk(false))
    }
    checkHealth()
    const id = setInterval(checkHealth, 6000)
    return () => clearInterval(id)
  }, [setBackendOk])

  /* ── Load directory ────────────────────────────────────── */
  const loadDir = useCallback(async () => {
    if (activeView !== 'files') return
    setLoading(true)
    try {
      const data = await api.list(currentPath)
      setEntries(data.entries || [])
      setBackendOk(true)
    } catch (e) {
      setBackendOk(false)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [currentPath, refreshKey, activeView, setBackendOk])

  useEffect(() => { loadDir() }, [loadDir])

  /* ── Keyboard shortcuts ────────────────────────────────── */
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setShowSearch(true)
      }
      if (e.key === 'F2' && selectedItems.length === 1) setRenameModal(true)
      if (e.key === 'Delete' && selectedItems.length) setDeleteModal(true)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedItems.length) handleCopy()
      if ((e.metaKey || e.ctrlKey) && e.key === 'x' && selectedItems.length) handleCut()
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) handlePaste()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedItems, clipboard])

  /* ── File operations ───────────────────────────────────── */
  async function handleCreate(name) {
    const path = currentPath ? `${currentPath}/${name}` : name
    try {
      await (createModal === 'directory' ? api.createDir(path) : api.createFile(path))
      notify(`Created: ${name}`, 'success')
      refresh()
    } catch (e) {
      notify(`Create failed: ${e.message}`, 'error')
    }
  }

  async function handleRename(newName) {
    const entry = selectedItems[0]
    if (!entry) return
    try {
      await api.rename(entry.path, newName)
      notify(`Renamed to: ${newName}`, 'success')
      refresh()
      setSelectedItems([])
    } catch (e) {
      notify(`Rename failed: ${e.message}`, 'error')
    }
  }

  async function handleDelete() {
    for (const entry of selectedItems) {
      try {
        await api.remove(entry.path)
      } catch (e) {
        notify(`Delete failed for "${entry.name}": ${e.message}`, 'error')
        return
      }
    }
    notify(`Deleted ${selectedItems.length} item(s)`, 'success')
    setSelectedItems([])
    refresh()
  }

  function handleCopy() {
    setClipboard({ op: 'copy', entries: [...selectedItems] })
    notify(`Copied ${selectedItems.length} item(s) to clipboard`, 'info')
  }

  function handleCut() {
    setClipboard({ op: 'cut', entries: [...selectedItems] })
    notify(`Cut ${selectedItems.length} item(s) – paste to move`, 'info')
  }

  async function handlePaste() {
    if (!clipboard) return
    for (const entry of clipboard.entries) {
      const dst = currentPath ? `${currentPath}/${entry.name}` : entry.name
      try {
        if (clipboard.op === 'copy') await api.copy(entry.path, dst)
        else                         await api.move(entry.path, dst)
      } catch (e) {
        notify(`Paste failed for "${entry.name}": ${e.message}`, 'error')
        return
      }
    }
    notify(`Pasted ${clipboard.entries.length} item(s)`, 'success')
    if (clipboard.op === 'cut') setClipboard(null)
    refresh()
  }

  async function handleLoadPermissions(entry) {
    try {
      const data = await api.getPermissions(entry.path)
      setPermsData(data)
    } catch (e) {
      notify(`Cannot load permissions: ${e.message}`, 'error')
    }
  }

  async function handleSavePermissions(mode) {
    const entry = selectedItems[0]
    if (!entry) return
    try {
      await api.setPermissions(entry.path, mode)
      notify(`Permissions updated to ${mode}`, 'success')
      refresh()
    } catch (e) {
      notify(`chmod failed: ${e.message}`, 'error')
    }
  }

  /* ── Open entry ─────────────────────────────────────────── */
  function handleOpen(entry) {
    if (entry.isDir) {
      navigateTo(entry.path)
    } else {
      addRecent(entry)
      setPreviewFile(entry)
    }
  }

  /* ── Context menu ───────────────────────────────────────── */
  function handleContextMenu(e, entry) {
    e.preventDefault()
    setSelectedItems(prev => prev.find(x => x.path === entry.path) ? prev : [entry])
    setCtxMenu({ x: e.clientX, y: e.clientY, entry })
  }
  function closeCtx() { setCtxMenu(null) }
  const ctxEntry = ctxMenu?.entry

  /* ── Starred view ───────────────────────────────────────── */
  const StarredView = () => (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center gap-2 mb-4">
        <Star size={20} className="text-yellow-500" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Starred Files</h2>
        <span className="text-xs text-gray-400 ml-1">({starred.length} items)</span>
      </div>
      {starred.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Star size={40} className="text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No starred files yet</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">Right-click any file and select "Star"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-w-2xl">
          {starred.map(path => {
            const name = path.split('/').pop()
            return (
              <div
                key={path}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100
                           dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50
                           dark:hover:bg-gray-800 cursor-pointer group transition-colors"
                onClick={() => {
                  const parentPath = path.split('/').slice(0, -1).join('/')
                  navigateTo(parentPath)
                }}
              >
                <FileText size={18} className="text-brand-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{path}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); toggleStar({ path, name }) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-yellow-50
                             dark:hover:bg-yellow-900/30"
                >
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  /* ── Recent view ─────────────────────────────────────────── */
  const RecentView = () => (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={20} className="text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Files</h2>
        <span className="text-xs text-gray-400 ml-1">({recent.length} items)</span>
      </div>
      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Clock size={40} className="text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No recently opened files</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">Files you open will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-w-2xl">
          {recent.map(entry => (
            <div
              key={entry.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100
                         dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50
                         dark:hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => { addRecent(entry); setPreviewFile(entry) }}
            >
              <FileText size={18} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{entry.name}</p>
                <p className="text-xs text-gray-400 font-mono truncate">{entry.path}</p>
              </div>
              {entry.size != null && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {entry.size < 1024 ? `${entry.size} B`
                   : entry.size < 1024*1024 ? `${(entry.size/1024).toFixed(1)} KB`
                   : `${(entry.size/1024/1024).toFixed(1)} MB`}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar onSearch={() => setShowSearch(true)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          onNewFile={()  => setCreateModal('file')}
          onNewFolder={() => setCreateModal('directory')}
          onRefresh={refresh}
          loading={loading}
        />

        {/* File area + optional preview panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {activeView === 'starred' ? <StarredView /> :
           activeView === 'recent'  ? <RecentView /> :
           <FileBrowser
             entries={entries}
             loading={loading}
             onOpenEntry={handleOpen}
             onContextMenu={handleContextMenu}
           />
          }

          {/* Preview panel */}
          {previewFile && (
            <div className="w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-800
                            overflow-hidden flex flex-col">
              <FilePreview
                entry={previewFile}
                onClose={() => setPreviewFile(null)}
                isStarred={isStarred(previewFile.path)}
                onToggleStar={() => toggleStar(previewFile)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Overlays ──────────────────────────────────────── */}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          entry={ctxEntry}
          onClose={closeCtx}
          onOpen={() => handleOpen(ctxEntry)}
          onRename={() => setRenameModal(true)}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onDelete={() => setDeleteModal(true)}
          onStar={() => toggleStar(ctxEntry)}
          isStarred={ctxEntry ? isStarred(ctxEntry.path) : false}
          onPermissions={async () => {
            await handleLoadPermissions(ctxEntry)
            setPermsModal(true)
          }}
          onProperties={() => setPropsModal(true)}
        />
      )}

      {/* Search */}
      {showSearch && (
        <SearchPanel
          onClose={() => setShowSearch(false)}
          onOpenEntry={handleOpen}
        />
      )}

      {/* Modals */}
      <CreateModal
        open={!!createModal}
        type={createModal}
        onClose={() => setCreateModal(null)}
        onConfirm={handleCreate}
      />
      <RenameModal
        open={renameModal}
        entry={selectedItems[0]}
        onClose={() => setRenameModal(false)}
        onConfirm={handleRename}
      />
      <DeleteModal
        open={deleteModal}
        entries={selectedItems}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
      />
      <PermissionsModal
        open={permsModal}
        entry={selectedItems[0]}
        perms={permsData}
        onClose={() => setPermsModal(false)}
        onSave={handleSavePermissions}
      />
      <PropertiesModal
        open={propsModal}
        entry={selectedItems[0]}
        onClose={() => setPropsModal(false)}
      />

      {/* Notifications */}
      <Notifications />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <FileManager />
    </AppProvider>
  )
}
