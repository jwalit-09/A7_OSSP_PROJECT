import {
  File, Folder, FileText, FileCode, FileImage, FileArchive,
  Film, Music, FileJson, Terminal, Settings, AlertCircle,
} from 'lucide-react'

const EXT_MAP = {
  // Directories handled separately
  // Text
  txt: FileText, md: FileText, log: FileText, csv: FileText,
  // Code
  c: FileCode, h: FileCode, cpp: FileCode, cc: FileCode,
  js: FileCode, jsx: FileCode, ts: FileCode, tsx: FileCode,
  py: FileCode, rb: FileCode, go: FileCode, rs: FileCode,
  java: FileCode, kt: FileCode, swift: FileCode, php: FileCode,
  html: FileCode, css: FileCode, scss: FileCode, less: FileCode,
  // JSON / config
  json: FileJson, yaml: FileJson, yml: FileJson, toml: FileJson,
  xml: FileJson, env: FileJson,
  // Shell
  sh: Terminal, bash: Terminal, zsh: Terminal, fish: Terminal,
  makefile: Settings,
  // Images
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage,
  svg: FileImage, webp: FileImage, ico: FileImage, bmp: FileImage,
  // Archives
  zip: FileArchive, tar: FileArchive, gz: FileArchive, bz2: FileArchive,
  xz: FileArchive, rar: FileArchive, '7z': FileArchive,
  // Media
  mp4: Film, mkv: Film, avi: Film, mov: Film, webm: Film,
  mp3: Music, wav: Music, flac: Music, ogg: Music,
}

const EXT_COLOR = {
  c: 'text-blue-500', h: 'text-orange-400', cpp: 'text-blue-600',
  js: 'text-yellow-400', jsx: 'text-cyan-400', ts: 'text-blue-500',
  tsx: 'text-cyan-500', py: 'text-green-500', sh: 'text-green-400',
  bash: 'text-green-400', json: 'text-yellow-500', html: 'text-orange-500',
  css: 'text-blue-400', md: 'text-gray-500',
  png: 'text-purple-400', jpg: 'text-purple-400', svg: 'text-purple-500',
  zip: 'text-amber-500', tar: 'text-amber-500', gz: 'text-amber-500',
  mp4: 'text-red-400', mp3: 'text-pink-400',
}

export function getFileIcon(entry, size = 20) {
  if (entry.isDir) return { Icon: Folder, color: 'text-amber-400', label: 'Directory' }

  const ext = entry.name.includes('.')
    ? entry.name.split('.').pop().toLowerCase()
    : entry.name.toLowerCase()

  const Icon  = EXT_MAP[ext] || File
  const color = EXT_COLOR[ext] || 'text-gray-400 dark:text-gray-500'
  return { Icon, color, label: ext.toUpperCase() || 'File' }
}

export function FileIcon({ entry, size = 20, className = '' }) {
  const { Icon, color } = getFileIcon(entry, size)
  return <Icon size={size} className={`${color} flex-shrink-0 ${className}`} />
}

export function formatSize(bytes) {
  if (bytes === null || bytes === undefined || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000)   return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function isTextFile(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  const TEXT_EXTS = new Set([
    'txt','md','log','csv','json','yaml','yml','toml','xml','env',
    'c','h','cpp','cc','js','jsx','ts','tsx','py','rb','go','rs',
    'java','kt','swift','php','html','css','scss','less',
    'sh','bash','zsh','fish','makefile','gitignore','dockerfile',
    'conf','cfg','ini','properties','sql',
  ])
  return TEXT_EXTS.has(ext) || TEXT_EXTS.has(name.toLowerCase())
}

export function isImageFile(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return ['png','jpg','jpeg','gif','svg','webp','ico','bmp'].includes(ext)
}

export function joinPath(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}

export function parentPath(path) {
  if (!path) return ''
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}
