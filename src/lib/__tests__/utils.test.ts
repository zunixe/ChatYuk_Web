import { describe, expect, it } from 'vitest'
import {
  genderLabel,
  isDataUrl,
  isHttpUrl,
  isImagePath,
  statusLabel,
  toInt,
} from '@/lib/utils'

describe('genderLabel (same wording as Android)', () => {
  it('maps male and female', () => {
    expect(genderLabel('male')).toBe('Laki-laki')
    expect(genderLabel('female')).toBe('Perempuan')
  })

  it('falls back to Lainnya for unknown/empty values', () => {
    expect(genderLabel('other')).toBe('Lainnya')
    expect(genderLabel(null)).toBe('Lainnya')
    expect(genderLabel('')).toBe('Lainnya')
  })
})

describe('statusLabel', () => {
  it('maps presence states', () => {
    expect(statusLabel('online')).toBe('online')
    expect(statusLabel('idle')).toBe('sedang tidak aktif')
    expect(statusLabel('offline')).toBe('offline')
    expect(statusLabel('invisible')).toBe('offline')
    expect(statusLabel(null)).toBe('offline')
  })
})

describe('media path helpers', () => {
  it('detects image paths', () => {
    expect(isImagePath('chat/uid/file.jpg')).toBe(true)
    expect(isImagePath('avatars/uid/photo.png')).toBe(true)
    expect(isImagePath('https://x.test/a.webp')).toBe(true)
    expect(isImagePath('videos/uid/clip.mp4')).toBe(false)
    expect(isImagePath(null)).toBe(false)
  })

  it('detects data and http urls', () => {
    expect(isDataUrl('data:image/png;base64,AAA')).toBe(true)
    expect(isDataUrl('https://x.test/a.png')).toBe(false)
    expect(isHttpUrl('https://x.test/a.png')).toBe(true)
    expect(isHttpUrl('http://x.test')).toBe(true)
    expect(isHttpUrl('chat/a.png')).toBe(false)
    expect(isHttpUrl(undefined)).toBe(false)
  })
})

describe('toInt', () => {
  it('parses numbers and falls back', () => {
    expect(toInt('12')).toBe(12)
    expect(toInt(undefined, 5)).toBe(5)
    expect(toInt('abc', 7)).toBe(7)
  })
})
