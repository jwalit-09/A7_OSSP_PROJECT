import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AppContext = createContext(null)

function loadStarred() {
  try { return JSON.parse(localStorage.getItem('sf-starred') || '[]') } catch { return [] }
}
function saveStarred(arr) {
  localStorage.setItem('sf-starred', JSON.stringify(arr))
}
function loadRecent() {
  try { return JSON.parse(localStorage.getItem('sf-recent') || '[]') } catch { return [] }
}
function saveRecent(arr) {
  localStorage.setItem('sf-recent', JSON.stringify(arr.slice(0, 20)))
}

export function AppProvider({ children }) {
  const [currentPath, setCurrentPath]   = useState('')
  const [activeView, setActiveView]     = useState('files') // 'files' | 'starred' | 'recent'
  const [selectedItems, setSelectedItems] = useState([])
  const [viewMode, setViewMode]         = useState('grid')
  const [sortBy, setSortBy]             = useState('name')
  const [sortDir, setSortDir]           = useState('asc')
  const [theme, setTheme]               = useState(() =>
    localStorage.getItem('sf-theme') || 'light'
  )
  const [backendOk, setBackendOk]       = useState(null)
  const [notifications, setNotifications] = useState([])
  const [clipboard, setClipboard]       = useState(null)
  const [refreshKey, setRefreshKey]     = useState(0)
  const [starred, setStarredState]      = useState(loadStarred)
  const [recent, setRecentState]        = useState(loadRecent)

  /* Auto-retry backend every 5s when offline */
  useEffect(() => {
    if (backendOk !== false) return
    const id = setInterval(() => {
      fetch('/api/health')
        .then(r => r.json())
        .then(j => { if (j.success) { setBackendOk(true); clearInterval(id) } })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [backendOk])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const notify = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setNotifications(n => [...n, { id, message, type }])
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 4000)
  }, [])

  const dismissNotification = useCallback((id) => {
    setNotifications(n => n.filter(x => x.id !== id))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('sf-theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }, [])

  /* Navigation */
  const navigateTo = useCallback((path) => {
    setCurrentPath(path)
    setSelectedItems([])
    setActiveView('files')
  }, [])

  const navigateUp = useCallback(() => {
    if (!currentPath) return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    navigateTo(parts.join('/'))
  }, [currentPath, navigateTo])

  const breadcrumbs = [
    { label: 'Workspace', path: '' },
    ...currentPath.split('/').filter(Boolean).map((seg, i, arr) => ({
      label: seg,
      path: arr.slice(0, i + 1).join('/'),
    })),
  ]

  /* Starred */
  const isStarred = useCallback((path) => starred.includes(path), [starred])

  const toggleStar = useCallback((entry) => {
    const targetPath = typeof entry === 'string' ? entry : entry?.path
    if (!targetPath) return
    setStarredState(prev => {
      let next
      if (prev.includes(targetPath)) {
        next = prev.filter(p => p !== targetPath)
      } else {
        next = [...prev, targetPath]
      }
      saveStarred(next)
      return next
    })
  }, [])

  /* Recent files */
  const addRecent = useCallback((entry) => {
    if (!entry || entry.isDir) return
    setRecentState(prev => {
      const filtered = prev.filter(r => r.path !== entry.path)
      const next = [{
        name: entry.name || entry.path.split('/').pop(),
        path: entry.path,
        mtime: entry.mtime,
        size: entry.size,
        isDir: false,
      }, ...filtered]
      saveRecent(next)
      return next
    })
  }, [])

  const clearRecent = useCallback(() => {
    setRecentState([])
    saveRecent([])
  }, [])

  /* Sync starred and recent on file operations */
  const syncDeleted = useCallback((path) => {
    setStarredState(prev => {
      const next = prev.filter(p => p !== path && !p.startsWith(path + '/'))
      saveStarred(next)
      return next
    })
    setRecentState(prev => {
      const next = prev.filter(r => r.path !== path && !r.path.startsWith(path + '/'))
      saveRecent(next)
      return next
    })
  }, [])

  const syncRenamed = useCallback((oldPath, newPath, newName) => {
    setStarredState(prev => {
      const next = prev.map(p => {
        if (p === oldPath) return newPath
        if (p.startsWith(oldPath + '/')) return newPath + p.slice(oldPath.length)
        return p
      })
      saveStarred(next)
      return next
    })
    setRecentState(prev => {
      const next = prev.map(r => {
        if (r.path === oldPath) {
          return { ...r, path: newPath, name: newName || newPath.split('/').pop() }
        }
        if (r.path.startsWith(oldPath + '/')) {
          return { ...r, path: newPath + r.path.slice(oldPath.length) }
        }
        return r
      })
      saveRecent(next)
      return next
    })
  }, [])

  /* Sort entries */
  const sortEntries = useCallback((entries) => {
    return [...entries].sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      let cmp = 0
      if (sortBy === 'name')       cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'size')  cmp = (a.size || 0) - (b.size || 0)
      else if (sortBy === 'mtime') cmp = new Date(a.mtime) - new Date(b.mtime)
      else if (sortBy === 'type')  cmp = getExt(a.name).localeCompare(getExt(b.name))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [sortBy, sortDir])

  return (
    <AppContext.Provider value={{
      currentPath, navigateTo, navigateUp, breadcrumbs,
      activeView, setActiveView,
      selectedItems, setSelectedItems,
      viewMode, setViewMode,
      sortBy, setSortBy, sortDir, setSortDir, sortEntries,
      theme, toggleTheme,
      backendOk, setBackendOk,
      notifications, notify, dismissNotification,
      clipboard, setClipboard,
      refreshKey, refresh,
      starred, isStarred, toggleStar,
      recent, addRecent, clearRecent,
      syncDeleted, syncRenamed,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}
