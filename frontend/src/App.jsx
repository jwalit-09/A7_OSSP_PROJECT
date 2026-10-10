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

/* ── Inner app (has access to context) ───────────────────── */
function FileManager() {
  const {
    currentPath, navigateTo, setBackendOk,
    selectedItems, setSelectedItems,
    notify, refresh, refreshKey,
    clipboard, setClipboard,
    theme,
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
  const [createModal,    setCreateModal]    = useState(null)  // 'file' | 'directory'
  const [renameModal,    setRenameModal]    = useState(false)
  const [deleteModal,    setDeleteModal]    = useState(false)
  const [permsModal,     setPermsModal]     = useState(false)
  const [propsModal,     setPropsModal]     = useState(false)
  const [showSearch,     setShowSearch]     = useState(false)

  /* Context menu */
  const [ctxMenu, setCtxMenu] = useState(null)  // { x, y, entry }

  /* Permissions data */
  const [permsData, setPermsData] = useState(null)

  /* ── Backend health check ──────────────────────────────── */
  useEffect(() => {
    api.health()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false))
  }, [setBackendOk])

  /* ── Load directory ────────────────────────────────────── */
  const loadDir = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.list(currentPath)
      setEntries(data.entries || [])
      setBackendOk(true)
    } catch (e) {
      if (e.message.includes('fetch') || e.message.includes('network')) {
        setBackendOk(false)
        notify('Cannot reach backend – is the server running?', 'error')
      } else {
        notify(e.message, 'error')
      }
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [currentPath, refreshKey, setBackendOk, notify])

  useEffect(() => { loadDir() }, [loadDir])

  /* ── Keyboard shortcuts ────────────────────────────────── */
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setShowSearch(true)
      }
      if (e.key === 'F2' && selectedItems.length === 1) setRenameModal(true)
      if (e.key === 'Delete' && selectedItems.length) setDeleteModal(true)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedItems.length)
        handleCopy()
      if ((e.metaKey || e.ctrlKey) && e.key === 'x' && selectedItems.length)
        handleCut()
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard)
        handlePaste()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedItems, clipboard])

  /* ── File operation handlers ───────────────────────────── */
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

  /* ── Open entry (double-click or context menu) ─────────── */
  function handleOpen(entry) {
    if (entry.isDir) {
      navigateTo(entry.path)
    } else {
      setPreviewFile(entry)
    }
  }

  /* ── Context menu ──────────────────────────────────────── */
  function handleContextMenu(e, entry) {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, entry })
  }

  function closeCtx() { setCtxMenu(null) }

  const ctxEntry = ctxMenu?.entry

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar onSearch={() => setShowSearch(true)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          onNewFile={()   => setCreateModal('file')}
          onNewFolder={()  => setCreateModal('directory')}
          onRefresh={refresh}
          loading={loading}
        />

        {/* File area + optional preview panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <FileBrowser
            entries={entries}
            loading={loading}
            onOpenEntry={handleOpen}
            onContextMenu={handleContextMenu}
          />

          {/* Preview panel */}
          {previewFile && (
            <div className="w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-800
                            overflow-hidden flex flex-col">
              <FilePreview entry={previewFile} onClose={() => setPreviewFile(null)} />
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

/* ── Root ──────────────────────────────────────────────────── */
export default function App() {
  return (
    <AppProvider>
      <FileManager />
    </AppProvider>
  )
}
