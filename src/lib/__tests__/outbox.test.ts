import { describe, expect, it } from 'vitest'
import { isNetworkError } from '@/lib/network-error'

// Deteksi ini menentukan apakah pesan diantrekan (offline) atau langsung
// dilaporkan gagal — salah klasifikasi = pesan hilang atau antrean palsu.
describe('isNetworkError', () => {
  it('treats fetch/connection failures as network errors', () => {
    for (const message of [
      'TypeError: Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'Network request failed',
      'Load failed',
      'Request timeout',
      'Connection reset by peer',
    ]) {
      expect(isNetworkError(new Error(message)), message).toBe(true)
    }
  })

  it('does not queue permission/validation errors', () => {
    for (const message of [
      'new row violates row-level security policy',
      'permission denied for table private_messages',
      'Pesan kosong.',
      'Message too long (max 2000 chars)',
      'invalid input syntax for type uuid',
    ]) {
      expect(isNetworkError(new Error(message)), message).toBe(false)
    }
  })

  it('accepts string errors and unknown values', () => {
    expect(isNetworkError('Failed to fetch')).toBe(true)
    expect(isNetworkError(undefined)).toBe(false)
    expect(isNetworkError({})).toBe(false)
  })
})
