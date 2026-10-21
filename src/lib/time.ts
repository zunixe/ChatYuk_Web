import { format, formatDistanceToNow, isThisYear, isToday, isYesterday } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatChatTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  if (isToday(date)) return format(date, 'HH.mm')
  if (isYesterday(date)) return 'Kemarin'
  if (isThisYear(date)) return format(date, 'd MMM', { locale: localeId })
  return format(date, 'dd/MM/yy')
}

export function formatMessageTime(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? format(date, 'HH.mm') : ''
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
  if (!date) return 'Terakhir dilihat belum tersedia'
  return `Terakhir dilihat ${formatDistanceToNow(date, { addSuffix: true, locale: localeId })}`
}

export function formatRelative(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  return formatDistanceToNow(date, { addSuffix: true, locale: localeId })
}

export function sameDay(a: string | null | undefined, b: string | null | undefined): boolean {
  const dateA = parseDate(a)
  const dateB = parseDate(b)
  if (!dateA || !dateB) return false
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}
