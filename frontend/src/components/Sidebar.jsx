import {
  Terminal, FolderOpen, Clock, Star, Search, HardDrive,
  Sun, Moon, Wifi, WifiOff, RefreshCw,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Sidebar({ onSearch }) {
  const {
    currentPath, navigateTo, theme, toggleTheme,
    backendOk, setBackendOk,
    activeView, setActiveView,
    starred, recent,
  } = useApp()

  function retryBackend() {
    setBackendOk(null)
    fetch('/api/health')
      .then(r => r.json())
      .then(j => setBackendOk(j.success ? true : false))
      .catch(() => setBackendOk(false))
  }

  return (
    <aside className="flex flex-col w-60 flex-shrink-0 border-r border-gray-200
                      dark:border-gray-800 bg-white dark:bg-gray-950 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-200
                      dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center
                        shadow-md shadow-brand-600/30">
          <Terminal size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
            ShellForge
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
            File Manager
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest
                      text-gray-400 dark:text-gray-600">
          Navigation
        </p>

        {/* All Files */}
        <button
          onClick={() => { navigateTo(''); setActiveView('files') }}
          className={`sidebar-item w-full text-left ${
            activeView === 'files' ? 'active' : ''
          }`}
        >
          <FolderOpen size={16} />
          <span className="flex-1">All Files</span>
        </button>

        {/* Recent */}
        <button
          onClick={() => setActiveView('recent')}
          className={`sidebar-item w-full text-left ${activeView === 'recent' ? 'active' : ''}`}
        >
          <Clock size={16} />
          <span className="flex-1">Recent</span>
          {recent.length > 0 && (
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500
                             dark:text-gray-400 px-1.5 py-0.5 rounded-full">
              {recent.length}
            </span>
          )}
        </button>

        {/* Starred */}
        <button
          onClick={() => setActiveView('starred')}
          className={`sidebar-item w-full text-left ${activeView === 'starred' ? 'active' : ''}`}
        >
          <Star size={16} />
          <span className="flex-1">Starred</span>
          {starred.length > 0 && (
            <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600
                             dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
              {starred.length}
            </span>
          )}
        </button>

        {/* Search */}
        <button
          onClick={onSearch}
          className="sidebar-item w-full text-left mt-1"
        >
          <Search size={16} />
          <span className="flex-1">Search</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px]
                          font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500
                          border border-gray-200 dark:border-gray-700">
            ⌘K
          </kbd>
        </button>

        {/* Starred quick list */}
        {activeView === 'starred' && starred.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest
                          text-gray-400 dark:text-gray-600">
              Starred Items
            </p>
            {starred.slice(0, 8).map(path => (
              <button
                key={path}
                onClick={() => {
                  const parts = path.split('/')
                  const parentPath = parts.slice(0, -1).join('/')
                  navigateTo(parentPath)
                }}
                className="sidebar-item w-full text-left text-xs truncate pl-5"
              >
                <Star size={12} className="text-yellow-500 flex-shrink-0" />
                <span className="truncate">{path.split('/').pop()}</span>
              </button>
            ))}
          </>
        )}

        {/* Current path */}
        {currentPath && activeView === 'files' && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest
                          text-gray-400 dark:text-gray-600">
              Current Path
            </p>
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400
                              font-mono overflow-hidden">
                <HardDrive size={12} className="flex-shrink-0" />
                <span className="truncate">{currentPath}</span>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Bottom: status + theme */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
        {/* Backend status */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer select-none
            ${backendOk === true
              ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
              : backendOk === false
                ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
            }`}
          onClick={backendOk === false ? retryBackend : undefined}
          title={backendOk === false ? 'Click to retry connection' : undefined}
        >
          {backendOk === true  ? <Wifi size={13} />    :
           backendOk === false ? <WifiOff size={13} /> :
           <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-600
                            animate-spin" />}
          <span className="flex-1">
            {backendOk === true  ? 'Backend connected' :
             backendOk === false ? 'Backend offline'   : 'Connecting…'}
          </span>
          {backendOk === false && (
            <RefreshCw size={12} className="flex-shrink-0 opacity-70" />
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-item w-full"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </div>
    </aside>
  )
}
