import { fetchProfile } from '@/lib/api/profiles'
import { supabase } from '@/lib/supabase'
import { cacheChats } from '@/lib/db'
import type { Chat } from '@/lib/types'

export function privateChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_')
}

export function otherParticipant(chat: Chat, myUid: string): string {
  return chat.participants.find((uid) => uid !== myUid) ?? myUid
}

export function chatDisplayName(chat: Chat, myUid: string): string {
  const other = otherParticipant(chat, myUid)
  return chat.participant_names?.[other]?.trim() || 'Pengguna ChatYuk'
}

export function chatUnreadCount(chat: Chat, myUid: string): number {
  const raw = chat.unread_counts?.[myUid]
  return typeof raw === 'number' && raw > 0 ? raw : 0
}

export function chatIsHidden(chat: Chat, myUid: string): boolean {
  return Array.isArray(chat.hidden_by) && chat.hidden_by.includes(myUid)
}

export function chatIsPinned(chat: Chat, myUid: string): boolean {
  return Array.isArray(chat.pinned_by) && chat.pinned_by.includes(myUid)
}

export function chatIsMuted(chat: Chat, myUid: string): boolean {
  return Array.isArray(chat.muted_by) && chat.muted_by.includes(myUid)
}

export function chatIsArchived(chat: Chat, myUid: string): boolean {
  return Array.isArray(chat.archived_by) && chat.archived_by.includes(myUid)
}

export function chatReadAt(chat: Chat | null | undefined, uid: string): string | null {
  if (!chat?.last_read_at) return null
  return chat.last_read_at[uid] ?? null
}

export function sortChats(chats: Chat[], myUid: string): Chat[] {
  return [...chats].sort((a, b) => {
    const pinnedA = chatIsPinned(a, myUid) ? 1 : 0
    const pinnedB = chatIsPinned(b, myUid) ? 1 : 0
    if (pinnedA !== pinnedB) return pinnedB - pinnedA
    const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return timeB - timeA
  })
}

export async function listChats(myUid: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('private_chats')
    .select('*')
    .contains('participants', [myUid])
    .gt('message_count', 0)
    .order('last_message_at', { ascending: false })
    .limit(200)
  if (error) throw error
  const chats = ((data ?? []) as Chat[]).filter((chat) => !chatIsHidden(chat, myUid))
  await cacheChats(chats)
  return chats
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const { data, error } = await supabase
    .from('private_chats')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle()
  if (error) throw error
  return (data as Chat | null) ?? null
}

export async function ensureChat(myUid: string, otherUid: string): Promise<Chat> {
  const chatId = privateChatId(myUid, otherUid)
  const existing = await getChat(chatId)
  if (existing) return existing

  const other = await fetchProfile(otherUid)
  if (!other?.nickname) throw new Error('Profil pengguna tidak ditemukan.')
  const me = await fetchProfile(myUid)
  if (!me?.nickname) throw new Error('Profil kamu belum lengkap.')

  const now = new Date().toISOString()
  const { error } = await supabase.from('private_chats').upsert(
    {
      chat_id: chatId,
      participants: [myUid, otherUid],
      participant_names: {
        [myUid]: me.nickname ?? '',
        [otherUid]: other.nickname ?? '',
      },
      participant_genders: {
        [myUid]: me.gender ?? '',
        [otherUid]: other.gender ?? '',
      },
      participant_locations: {
        [myUid]: me.country ?? '',
        [otherUid]: other.country ?? '',
      },
      participant_ages: {
        [myUid]: me.age ?? 0,
        [otherUid]: other.age ?? 0,
      },
      last_message: '',
      last_message_at: now,
    },
    { onConflict: 'chat_id', ignoreDuplicates: true },
  )
  if (error) throw error

  const chat = await getChat(chatId)
  if (!chat) throw new Error('Chat gagal dibuat.')
  return chat
}

export async function markChatRead(chatId: string, uid: string): Promise<void> {
  const { error } = await supabase.rpc('mark_chat_read', {
    p_chat_id: chatId,
    p_uid: uid,
  })
  if (error) throw error
}

export async function unhideChat(chatId: string, uid: string): Promise<void> {
  const chat = await getChat(chatId)
  if (!chat || !chatIsHidden(chat, uid)) return
  const hiddenBy = (chat.hidden_by ?? []).filter((value) => value !== uid)
  const hiddenAt = { ...(chat.hidden_at ?? {}) }
  delete hiddenAt[uid]
  const { error } = await supabase
    .from('private_chats')
    .update({ hidden_by: hiddenBy, hidden_at: hiddenAt })
    .eq('chat_id', chatId)
  if (error) throw error
}

/** Pin / unpin chat untuk diri sendiri (`pinned_by`). */
/**
 * Arsipkan / keluarkan dari arsip. Server RPC `archive_private_chat`
 * (paritas Android `archivePrivateChat`); kolom `archived_by` per-user.
 */
export async function setChatArchived(chatId: string, archived: boolean): Promise<void> {
  const { error } = await supabase.rpc('archive_private_chat', {
    p_chat_id: chatId,
    p_archive: archived,
  })
  if (error) throw error
}

export async function setChatPinned(chatId: string, uid: string, pinned: boolean): Promise<void> {
  const chat = await getChat(chatId)
  if (!chat) throw new Error('Chat tidak ditemukan.')
  const current = Array.isArray(chat.pinned_by) ? chat.pinned_by : []
  const next = pinned
    ? Array.from(new Set([...current, uid]))
    : current.filter((value) => value !== uid)
  const { error } = await supabase
    .from('private_chats')
    .update({ pinned_by: next })
    .eq('chat_id', chatId)
  if (error) throw error
}

/** Bisukan / bunyikan chat untuk diri sendiri (`muted_by`). */
export async function setChatMuted(chatId: string, uid: string, muted: boolean): Promise<void> {
  const chat = await getChat(chatId)
  if (!chat) throw new Error('Chat tidak ditemukan.')
  const current = Array.isArray(chat.muted_by) ? chat.muted_by : []
  const next = muted
    ? Array.from(new Set([...current, uid]))
    : current.filter((value) => value !== uid)
  const { error } = await supabase
    .from('private_chats')
    .update({ muted_by: next })
    .eq('chat_id', chatId)
  if (error) throw error
}
