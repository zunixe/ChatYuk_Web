import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatChatTime,
  formatDayLabel,
  formatLastSeen,
  formatMessageTime,
  parseDate,
  sameDay,
} from '@/lib/time'
import { previewForChat } from '@/lib/utils'

// Local time is used deliberately; assert against local Date constructors.
function local(y: number, m: number, d: number, h = 0, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString()
}

describe('time formatting (mirrors mobile message time behaviour)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 20, 15, 30))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses valid dates and rejects empty/invalid values', () => {
    expect(parseDate(local(2026, 10, 20))).toBeInstanceOf(Date)
    expect(parseDate('')).toBeNull()
    expect(parseDate(null)).toBeNull()
    expect(parseDate('not-a-date')).toBeNull()
  })

  it('chat list time: today shows HH.mm', () => {
    expect(formatChatTime(local(2026, 10, 20, 9, 5))).toBe('09.05')
  })

  it('chat list time: yesterday shows Kemarin', () => {
    expect(formatChatTime(local(2026, 10, 19, 23, 59))).toBe('Kemarin')
  })

  it('chat list time: this year shows day + short month', () => {
    expect(formatChatTime(local(2026, 10, 5, 8, 0))).toBe('5 Okt')
  })

  it('chat list time: previous years show dd/MM/yy', () => {
    expect(formatChatTime(local(2025, 12, 31, 8, 0))).toBe('31/12/25')
  })

  it('chat list time: empty for missing values', () => {
    expect(formatChatTime(null)).toBe('')
    expect(formatChatTime(undefined)).toBe('')
    expect(formatChatTime('invalid')).toBe('')
  })

  it('message bubble time is HH.mm', () => {
    expect(formatMessageTime(local(2026, 10, 20, 22, 7))).toBe('22.07')
    expect(formatMessageTime(null)).toBe('')
  })

  it('day separator labels today and yesterday', () => {
    expect(formatDayLabel(local(2026, 10, 20, 1, 0))).toBe('Hari ini')
    expect(formatDayLabel(local(2026, 10, 19, 1, 0))).toBe('Kemarin')
    expect(formatDayLabel(local(2026, 10, 6, 1, 0))).toBe('Selasa, 6 Oktober 2026')
    expect(formatDayLabel(null)).toBe('')
  })

  it('sameDay compares local calendar days', () => {
    expect(sameDay(local(2026, 10, 20, 0, 1), local(2026, 10, 20, 23, 59))).toBe(true)
    expect(sameDay(local(2026, 10, 20, 23, 59), local(2026, 10, 21, 0, 1))).toBe(false)
    expect(sameDay(null, local(2026, 10, 20))).toBe(false)
  })

  it('last seen falls back when timestamp is missing', () => {
    expect(formatLastSeen(null)).toBe('Terakhir dilihat belum tersedia')
    expect(formatLastSeen(local(2026, 10, 20, 15, 0))).toContain('Terakhir dilihat')
  })
})

describe('previewForChat', () => {
  it('prefixes my own messages with Anda:', () => {
    expect(previewForChat('halo', true)).toBe('Anda: halo')
    expect(previewForChat('halo', false)).toBe('halo')
  })

  it('falls back when there is no message yet', () => {
    expect(previewForChat('', false)).toBe('Belum ada pesan')
    expect(previewForChat(null, true)).toBe('Anda: Belum ada pesan')
  })
})
