import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/* ── Base Modal ──────────────────────────────────────────── */
function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) setTimeout(() => ref.current?.querySelector('input,textarea')?.focus(), 50)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={ref}
        className="relative w-full max-w-md card shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b
                        border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-md">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t
                          border-gray-200 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Create File / Folder Modal ──────────────────────────── */
export function CreateModal({ open, onClose, type, onConfirm }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setName(''); setError('') } }, [open])

  function validate(n) {
    if (!n.trim()) return 'Name is required'
    if (/[/\0]/.test(n)) return 'Name cannot contain / or null bytes'
    if (n === '.' || n === '..') return 'Invalid name'
    return ''
  }

  function handleConfirm() {
    const err = validate(name)
    if (err) { setError(err); return }
    onConfirm(name.trim())
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New ${type === 'directory' ? 'Folder' : 'File'}`}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleConfirm} className="btn-primary">Create</button>
        </>
      }
    >
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {type === 'directory' ? 'Folder' : 'File'} name
      </label>
      <input
        className="input"
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        placeholder={type === 'directory' ? 'my-folder' : 'file.txt'}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </Modal>
  )
}

/* ── Rename Modal ────────────────────────────────────────── */
export function RenameModal({ open, onClose, entry, onConfirm }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && entry) { setName(entry.name); setError('') }
  }, [open, entry])

  function handleConfirm() {
    const n = name.trim()
    if (!n) { setError('Name required'); return }
    if (/[/\0]/.test(n)) { setError('Invalid character'); return }
    if (n === '.' || n === '..') { setError('Invalid name'); return }
    onConfirm(n)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Rename "${entry?.name}"`}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleConfirm} className="btn-primary">Rename</button>
        </>
      }
    >
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        New name
      </label>
      <input
        className="input"
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </Modal>
  )
}

/* ── Delete Confirm Modal ────────────────────────────────── */
export function DeleteModal({ open, onClose, entries, onConfirm }) {
  const names = entries?.map(e => e.name) || []
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Deletion"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }} className="btn-danger">
            Delete permanently
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center
                        justify-center flex-shrink-0">
          <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
        </div>
        <div>
          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
            This action cannot be undone.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {names.length === 1
              ? <>Delete <strong className="text-gray-900 dark:text-gray-100">"{names[0]}"</strong>?</>
              : <>Delete <strong>{names.length} items</strong>?</>}
          </p>
        </div>
      </div>
    </Modal>
  )
}

/* ── Permissions Modal ────────────────────────────────────── */
export function PermissionsModal({ open, onClose, entry, perms, onSave }) {
  const [mode, setMode] = useState('644')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && perms) { setMode(perms.octalMode || '644'); setError('') }
  }, [open, perms])

  /* Parse/display permission bits */
  const GROUPS = [
    { label: 'Owner', shift: 6 },
    { label: 'Group', shift: 3 },
    { label: 'Other', shift: 0 },
  ]
  const BITS = [
    { label: 'r', bit: 4 },
    { label: 'w', bit: 2 },
    { label: 'x', bit: 1 },
  ]

  const parsed = parseInt(mode, 8) || 0

  function toggleBit(shift, bit) {
    const cur = parsed
    const newVal = cur ^ (bit << shift)
    setMode(newVal.toString(8).padStart(3, '0'))
  }

  function bitSet(shift, bit) {
    return !!(parsed & (bit << shift))
  }

  function handleSave() {
    if (!/^[0-7]{3,4}$/.test(mode)) { setError('Enter a valid octal mode (e.g. 644)'); return }
    onSave(mode)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Permissions: ${entry?.name}`}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Apply</button>
        </>
      }
    >
      {perms && (
        <div className="space-y-4">
          {/* Current info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
              <p className="text-gray-400 dark:text-gray-600 mb-0.5">Owner</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">{perms.owner}</p>
            </div>
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
              <p className="text-gray-400 dark:text-gray-600 mb-0.5">Group</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">{perms.group}</p>
            </div>
          </div>

          {/* Permission matrix */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1 text-xs font-medium text-gray-500">
              <span></span>
              {BITS.map(b => <span key={b.label} className="text-center">{b.label}</span>)}
            </div>
            {GROUPS.map(({ label, shift }) => (
              <div key={label} className="grid grid-cols-4 gap-1 items-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
                {BITS.map(({ label: bLabel, bit }) => {
                  const set = bitSet(shift, bit)
                  return (
                    <button
                      key={bLabel}
                      onClick={() => toggleBit(shift, bit)}
                      className={`perm-bit mx-auto ${set ? 'set' : 'unset'}`}
                    >
                      {set ? bLabel : '–'}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Manual octal input */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              Octal mode
            </label>
            <input
              className="input font-mono"
              value={mode}
              onChange={e => { setMode(e.target.value); setError('') }}
              placeholder="644"
              maxLength={4}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ── Properties Modal ─────────────────────────────────────── */
export function PropertiesModal({ open, onClose, entry }) {
  if (!entry) return null
  const rows = [
    ['Name', entry.name],
    ['Path', entry.path],
    ['Type', entry.type],
    ['Size', entry.isDir ? '—' : `${entry.size?.toLocaleString()} bytes`],
    ['Permissions', entry.permissions],
    ['Octal Mode', entry.octalMode],
    ['Owner', entry.owner],
    ['Group', entry.group],
    ['Modified', entry.mtime ? new Date(entry.mtime).toLocaleString() : '—'],
    ['Inode', entry.inode],
    ['Hard links', entry.nlink],
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Properties"
      footer={<button onClick={onClose} className="btn-ghost">Close</button>}
    >
      <div className="space-y-2">
        {rows.map(([k, v]) => v !== undefined && (
          <div key={k} className="flex gap-4 text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="w-28 flex-shrink-0 text-gray-500 dark:text-gray-500">{k}</span>
            <span className="font-mono text-gray-800 dark:text-gray-200 break-all">{String(v)}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
