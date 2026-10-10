import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentPath, setCurrentPath] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [viewMode, setViewMode] = useState('grid')      // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('name')          // 'name' | 'size' | 'mtime' | 'type'
  const [sortDir, setSortDir] = useState('asc')
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('sf-theme') || 'light'
  )
  const [backendOk, setBackendOk] = useState(null)      // null=checking, true, false
  const [notifications, setNotifications] = useState([])
  const [clipboard, setClipboard] = useState(null)      // { op:'copy'|'cut', paths:[] }
  const [refreshKey, setRefreshKey] = useState(0)

  /* Force re-fetch current directory */
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  /* Toast notifications */
  const notify = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setNotifications(n => [...n, { id, message, type }])
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 4000)
  }, [])

  const dismissNotification = useCallback((id) => {
    setNotifications(n => n.filter(x => x.id !== id))
  }, [])

  /* Theme */
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
  }, [])

  const navigateUp = useCallback(() => {
    if (!currentPath) return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    navigateTo(parts.join('/'))
  }, [currentPath, navigateTo])

  /* Breadcrumbs from current path */
  const breadcrumbs = [
    { label: 'Workspace', path: '' },
    ...currentPath.split('/').filter(Boolean).map((seg, i, arr) => ({
      label: seg,
      path: arr.slice(0, i + 1).join('/'),
    })),
  ]

  /* Sort entries */
  const sortEntries = useCallback((entries) => {
    return [...entries].sort((a, b) => {
      // Dirs always first
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1

      let cmp = 0
      if (sortBy === 'name')  cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'size')  cmp = (a.size || 0) - (b.size || 0)
      else if (sortBy === 'mtime') cmp = new Date(a.mtime) - new Date(b.mtime)
      else if (sortBy === 'type')  cmp = getExt(a.name).localeCompare(getExt(b.name))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [sortBy, sortDir])

  return (
    <AppContext.Provider value={{
      currentPath, navigateTo, navigateUp, breadcrumbs,
      selectedItems, setSelectedItems,
      viewMode, setViewMode,
      sortBy, setSortBy, sortDir, setSortDir, sortEntries,
      theme, toggleTheme,
      backendOk, setBackendOk,
      notifications, notify, dismissNotification,
      clipboard, setClipboard,
      refreshKey, refresh,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)

/* Helper */
function getExt(name) {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}
