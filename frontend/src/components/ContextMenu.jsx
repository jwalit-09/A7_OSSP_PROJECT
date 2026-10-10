import { useEffect, useRef } from 'react'
import {
  FolderOpen, Edit3, Copy, Scissors, Clipboard,
  Trash2, Shield, Info, Download,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ContextMenu({
  x, y, entry, onClose,
  onOpen, onRename, onCopy, onCut, onPaste, onDelete,
  onProperties, onPermissions,
}) {
  const { clipboard } = useApp()
  const ref = useRef(null)

  /* Close on outside click or Escape */
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    function keyHandler(e) { if (e.key === 'Escape') onClose() }
    setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('keydown', keyHandler)
    }, 0)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  /* Clamp to viewport */
  const style = { position: 'fixed', zIndex: 9999 }
  if (ref.current) {
    const w = ref.current.offsetWidth  || 200
    const h = ref.current.offsetHeight || 300
    style.left = Math.min(x, window.innerWidth  - w - 8)
    style.top  = Math.min(y, window.innerHeight - h - 8)
  } else {
    style.left = x
    style.top  = y
  }

  const sep = <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

  const Item = ({ Icon, label, onClick, danger, disabled }) => (
    <button
      disabled={disabled}
      onClick={() => { onClick(); onClose() }}
      className={`context-item ${danger ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950' : ''}
                  ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <Icon size={15} className="flex-shrink-0" />
      {label}
    </button>
  )

  return (
    <div ref={ref} style={style} className="context-menu min-w-[180px]">
      {/* Open */}
      <Item Icon={FolderOpen} label={entry?.isDir ? 'Open' : 'Open / Edit'} onClick={onOpen} />

      {sep}

      {/* Edit operations */}
      <Item Icon={Edit3}      label="Rename"              onClick={onRename} />
      <Item Icon={Copy}       label="Copy"                onClick={onCopy} />
      <Item Icon={Scissors}   label="Cut"                 onClick={onCut} />
      <Item
        Icon={Clipboard}
        label="Paste"
        onClick={onPaste}
        disabled={!clipboard}
      />

      {sep}

      {/* Permissions */}
      <Item Icon={Shield}     label="Permissions…"        onClick={onPermissions} />
      <Item Icon={Info}       label="Properties"          onClick={onProperties} />

      {sep}

      {/* Delete */}
      <Item Icon={Trash2}     label="Delete"              onClick={onDelete} danger />
    </div>
  )
}
