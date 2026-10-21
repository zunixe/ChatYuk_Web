import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/chat-photos/${path}` },
        }),
      }),
    },
  },
}))

import { mediaUrlForViewOnce } from '@/lib/media'
import type { Message } from '@/lib/types'

function msg(overrides: Partial<Message>): Message {
  return {
    id: 1,
    chat_id: 'a_b',
    sender_id: 'a',
    sender_name: 'A',
    sender_gender: 'male',
    text: '',
    type: 'view_once',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// Regresi nyata: path storage `chat/...` panjang (>80 char) pernah salah
// dideteksi sebagai base64 → menghasilkan data: URL rusak (ERR_INVALID_URL).
describe('mediaUrlForViewOnce', () => {
  it('returns a storage URL for long chat/ paths instead of a broken data URL', () => {
    const longPath =
      'chat/d0000001-0000-4000-8000-00000000000a_d0000002-0000-4000-8000-00000000000b/vo-real.jpg'
    expect(longPath.length).toBeGreaterThan(80)

    const url = mediaUrlForViewOnce(msg({ image_path: longPath }))
    expect(url).toBe(`https://cdn.test/chat-photos/${longPath}`)
    expect(url?.startsWith('data:')).toBe(false)
  })

  it('still supports legacy raw base64 payloads', () => {
    const base64 = 'A'.repeat(120)
    const url = mediaUrlForViewOnce(msg({ image_path: base64 }))
    expect(url).toBe(`data:image/jpeg;base64,${base64}`)
  })

  it('passes through absolute and inline URLs', () => {
    expect(mediaUrlForViewOnce(msg({ image_path: 'https://x.test/a.jpg' }))).toBe(
      'https://x.test/a.jpg',
    )
    expect(mediaUrlForViewOnce(msg({ image_path: 'data:image/png;base64,AAA' }))).toBe(
      'data:image/png;base64,AAA',
    )
  })

  it('returns null when there is no media path', () => {
    expect(mediaUrlForViewOnce(msg({ image_path: null, image_data: null }))).toBeNull()
  })
})
