import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/db', () => ({ cacheChats: async () => {} }))

import {
  chatDisplayName,
  chatIsHidden,
  chatIsMuted,
  chatIsPinned,
  chatReadAt,
  chatUnreadCount,
  otherParticipant,
  privateChatId,
  sortChats,
} from '@/lib/api/chats'
import type { Chat } from '@/lib/types'

const ME = 'uid-me'
const OTHER = 'uid-other'

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    chat_id: `${ME}_${OTHER}`,
    participants: [ME, OTHER],
    participant_names: { [ME]: 'Raka', [OTHER]: 'Sari' },
    unread_counts: {},
    last_message_at: '2026-10-20T10:00:00.000Z',
    ...overrides,
  }
}

describe('privateChatId (sync contract with mobile)', () => {
  it('is independent of participant order', () => {
    expect(privateChatId('b', 'a')).toBe('a_b')
    expect(privateChatId('a', 'b')).toBe('a_b')
  })

  it('keeps sorted uid pair joined with underscore', () => {
    expect(privateChatId(OTHER, ME)).toBe(`${ME}_${OTHER}`)
  })
})

describe('participants and display name', () => {
  it('finds the other participant', () => {
    expect(otherParticipant(makeChat(), ME)).toBe(OTHER)
  })

  it('falls back to my uid when participants only contain me', () => {
    expect(otherParticipant(makeChat({ participants: [ME] }), ME)).toBe(ME)
  })

  it('uses the other participant nickname and trims it', () => {
    expect(chatDisplayName(makeChat(), ME)).toBe('Sari')
    expect(
      chatDisplayName(makeChat({ participant_names: { [OTHER]: '  Sari  ' } }), ME),
    ).toBe('Sari')
  })

  it('falls back when nickname is missing or blank', () => {
    expect(chatDisplayName(makeChat({ participant_names: {} }), ME)).toBe('Pengguna ChatYuk')
    expect(
      chatDisplayName(makeChat({ participant_names: { [OTHER]: '   ' } }), ME),
    ).toBe('Pengguna ChatYuk')
  })
})

describe('unread counts', () => {
  it('counts only positive numbers', () => {
    expect(chatUnreadCount(makeChat({ unread_counts: { [ME]: 3 } }), ME)).toBe(3)
    expect(chatUnreadCount(makeChat({ unread_counts: { [ME]: 0 } }), ME)).toBe(0)
    expect(chatUnreadCount(makeChat({ unread_counts: { [ME]: -2 } }), ME)).toBe(0)
    expect(chatUnreadCount(makeChat({ unread_counts: null }), ME)).toBe(0)
  })
})

describe('chat flags', () => {
  it('reads hidden, pinned and muted lists', () => {
    const chat = makeChat({
      hidden_by: [ME],
      pinned_by: [ME],
      muted_by: [OTHER],
    })
    expect(chatIsHidden(chat, ME)).toBe(true)
    expect(chatIsPinned(chat, ME)).toBe(true)
    expect(chatIsMuted(chat, ME)).toBe(false)
    expect(chatIsMuted(chat, OTHER)).toBe(true)
  })

  it('is safe for null lists', () => {
    const chat = makeChat({ hidden_by: null, pinned_by: null, muted_by: null })
    expect(chatIsHidden(chat, ME)).toBe(false)
    expect(chatIsPinned(chat, ME)).toBe(false)
    expect(chatIsMuted(chat, ME)).toBe(false)
  })
})

describe('chatReadAt', () => {
  it('returns read timestamp for uid', () => {
    const chat = makeChat({ last_read_at: { [ME]: '2026-10-20T11:00:00.000Z' } })
    expect(chatReadAt(chat, ME)).toBe('2026-10-20T11:00:00.000Z')
    expect(chatReadAt(chat, OTHER)).toBeNull()
    expect(chatReadAt(null, ME)).toBeNull()
  })
})

describe('sortChats (mirrors mobile chat list ordering)', () => {
  it('puts pinned chats first, then newest message', () => {
    const older = makeChat({ chat_id: 'c1', last_message_at: '2026-10-20T08:00:00.000Z' })
    const newer = makeChat({ chat_id: 'c2', last_message_at: '2026-10-20T12:00:00.000Z' })
    const pinned = makeChat({
      chat_id: 'c3',
      last_message_at: '2026-10-20T07:00:00.000Z',
      pinned_by: [ME],
    })
    const sorted = sortChats([older, newer, pinned], ME)
    expect(sorted.map((chat) => chat.chat_id)).toEqual(['c3', 'c2', 'c1'])
  })

  it('treats missing timestamps as oldest without crashing', () => {
    const missing = makeChat({ chat_id: 'c1', last_message_at: null })
    const dated = makeChat({ chat_id: 'c2', last_message_at: '2026-10-20T09:00:00.000Z' })
    expect(sortChats([missing, dated], ME).map((chat) => chat.chat_id)).toEqual(['c2', 'c1'])
  })

  it('does not mutate the input array', () => {
    const chats = [
      makeChat({ chat_id: 'a', last_message_at: '2026-10-20T08:00:00.000Z' }),
      makeChat({ chat_id: 'b', last_message_at: '2026-10-20T12:00:00.000Z' }),
    ]
    const before = chats.map((chat) => chat.chat_id)
    sortChats(chats, ME)
    expect(chats.map((chat) => chat.chat_id)).toEqual(before)
  })
})
