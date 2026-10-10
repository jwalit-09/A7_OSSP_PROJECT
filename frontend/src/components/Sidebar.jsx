import {
  Terminal, FolderOpen, Clock, Star, Search, HardDrive,
  Sun, Moon, Wifi, WifiOff, ChevronRight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Sidebar({ onSearch }) {
  const { currentPath, navigateTo, theme, toggleTheme, backendOk } = useApp()

  const NAV = [
    { label: 'All Files',    path: '',        Icon: FolderOpen },
    { label: 'Recent',       path: null,      Icon: Clock,     disabled: true },
    { label: 'Starred',      path: null,      Icon: Star,      disabled: true },
  ]

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

        {NAV.map(({ label, path, Icon, disabled }) => (
          <button
            key={label}
            disabled={disabled}
            onClick={() => !disabled && navigateTo(path)}
            className={`sidebar-item w-full text-left ${
              !disabled && currentPath === path ? 'active' : ''
            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {disabled && (
              <span className="text-[10px] text-gray-400 dark:text-gray-600">Soon</span>
            )}
          </button>
        ))}

        {/* Search button */}
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

        {/* Workspace quick nav */}
        {currentPath && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest
                          text-gray-400 dark:text-gray-600">
              Current Path
            </p>
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400
                              font-mono overflow-hidden">
                <HardDrive size={12} className="flex-shrink-0" />
                <span className="truncate">{currentPath || 'workspace'}</span>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Bottom: status + theme */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
        {/* Backend status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs
          ${backendOk === true
            ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
            : backendOk === false
              ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
          }`}>
          {backendOk === true  ? <Wifi size={13} />    :
           backendOk === false ? <WifiOff size={13} /> :
           <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-600
                            animate-spin" />}
          <span>
            {backendOk === true  ? 'Backend connected' :
             backendOk === false ? 'Backend offline'   : 'Connecting…'}
          </span>
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
