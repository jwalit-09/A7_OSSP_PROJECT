import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'

const ICONS = {
  success: { Icon: CheckCircle,    cls: 'text-green-500' },
  error:   { Icon: AlertCircle,    cls: 'text-red-500'   },
  warning: { Icon: AlertTriangle,  cls: 'text-amber-500' },
  info:    { Icon: Info,           cls: 'text-blue-500'  },
}

const BG = {
  success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950',
  error:   'border-red-200   dark:border-red-800   bg-red-50   dark:bg-red-950',
  warning: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950',
  info:    'border-blue-200  dark:border-blue-800  bg-blue-50  dark:bg-blue-950',
}

export default function Notifications() {
  const { notifications, dismissNotification } = useApp()

  if (!notifications.length) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map(({ id, message, type }) => {
        const { Icon, cls } = ICONS[type] || ICONS.info
        return (
          <div
            key={id}
            className={`pointer-events-auto flex items-start gap-3 p-3 pr-2 rounded-xl
              border shadow-lg animate-slide-up ${BG[type] || BG.info}`}
          >
            <Icon size={18} className={`mt-0.5 flex-shrink-0 ${cls}`} />
            <p className="flex-1 text-sm text-gray-800 dark:text-gray-200">{message}</p>
            <button
              onClick={() => dismissNotification(id)}
              className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600
                         dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5
                         transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
