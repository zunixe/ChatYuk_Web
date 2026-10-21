import { clsx, type ClassValue } from 'clsx'
import {
  differenceInCalendarDays,
  format,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'
import type { Message } from '@/lib/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(name: string | null | undefined): string {
  const clean = (name ?? '').trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

const AVATAR_GRADIENTS = [
  'from-sky-500 to-cyan-400',
  'from-indigo-500 to-blue-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-orange-400',
  'from-violet-500 to-fuchsia-400',
  'from-amber-500 to-yellow-400',
  'from-teal-500 to-emerald-400',
  'from-blue-600 to-sky-400',
]

export function avatarGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]!
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  try {
    const date = parseISO(value)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

export function formatMessageTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  return format(date, 'HH.mm')
}

export function formatChatTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  if (isToday(date)) return format(date, 'HH.mm')
  if (isYesterday(date)) return 'Kemarin'
  const diff = differenceInCalendarDays(new Date(), date)
  if (diff >= 0 && diff < 7) return format(date, 'EEEE', { locale: localeId })
  return format(date, 'dd/MM/yy')
}

export function formatDayLabel(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  if (isToday(date)) return 'Hari ini'
  if (isYesterday(date)) return 'Kemarin'
  return format(date, 'EEEE, d MMMM yyyy', { locale: localeId })
}

export function formatLastSeen(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return 'terakhir dilihat baru-baru ini'
  if (isToday(date)) return `terakhir dilihat ${format(date, 'HH.mm')}`
  if (isYesterday(date)) return `terakhir dilihat kemarin ${format(date, 'HH.mm')}`
  return `terakhir dilihat ${format(date, 'd MMM', { locale: localeId })} ${format(date, 'HH.mm')}`
}

export function messagePreview(message: Message | null | undefined): string {
  if (!message) return ''
  if (message.is_deleted) return 'Pesan ini telah dihapus'
  const text = (message.text ?? '').trim()
  switch (message.type) {
    case 'image':
    case 'view_once':
    case 'view_once_expired':
      return text || 'Foto'
    case 'video':
    case 'video_once':
    case 'video_once_expired':
      return text || 'Video'
    case 'voice':
      return text || 'Pesan suara'
    case 'sticker':
      return text || 'Stiker'
    case 'file':
      return text || 'Dokumen'
    case 'location':
      return text || 'Lokasi'
    case 'contact':
      return text || 'Kontak'
    case 'poll':
      return text || 'Polling'
    case 'call':
      return text || 'Panggilan'
    case 'coin':
    case 'gift':
      return text || 'Hadiah'
    default:
      return text
  }
}

export function previewForChat(lastMessage: string | null | undefined, lastSenderIsMe: boolean): string {
  const text = (lastMessage ?? '').trim()
  const preview = text || 'Belum ada pesan'
  return lastSenderIsMe ? `Anda: ${preview}` : preview
}

export function isImagePath(value: string | null | undefined): boolean {
  if (!value) return false
  return /\.(jpe?g|png|webp|gif)$/i.test(value) || value.startsWith('chat/') || value.startsWith('avatars/')
}

export function isDataUrl(value: string | null | undefined): boolean {
  return !!value && value.startsWith('data:')
}

export function isHttpUrl(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value)
}

export function genderLabel(gender: string | null | undefined): string {
  if (gender === 'male') return 'Laki-laki'
  if (gender === 'female') return 'Perempuan'
  return 'Lainnya'
}

export function statusLabel(status: string | null | undefined): string {
  if (status === 'online') return 'online'
  if (status === 'idle') return 'sedang tidak aktif'
  return 'offline'
}

export function toInt(value: string | undefined, fallback = 0): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let timer: number | undefined
  const wrapped = (...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), ms)
  }
  wrapped.cancel = () => {
    if (timer) window.clearTimeout(timer)
  }
  return wrapped
}
