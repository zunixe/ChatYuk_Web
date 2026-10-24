import { supabase } from '@/lib/supabase'

/**
 * Pesan berbintang (bookmark pribadi) — paritas Android `toggleStar`.
 * Tabel `starred_messages` dengan policy `auth.uid() = user_id`
 * (chat_type: 'private' | 'room').
 */
export type StarChatType = 'private' | 'room'

export async function isMessageStarred(
  userId: string,
  chatType: StarChatType,
  messageId: string | number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('starred_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('chat_type', chatType)
    .eq('message_id', String(messageId))
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

/** Daftar id pesan berbintang pada satu chat/room. */
export async function listStarredIds(
  userId: string,
  chatType: StarChatType,
  chatId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('starred_messages')
    .select('message_id')
    .eq('user_id', userId)
    .eq('chat_type', chatType)
    .eq('chat_id', chatId)
  if (error) throw error
  return (data ?? []).map((row) => String((row as { message_id: string }).message_id))
}

/** Toggle bintang. Return true bila sekarang berbintang. */
export async function toggleStar(input: {
  userId: string
  chatType: StarChatType
  chatId: string
  messageId: string | number
}): Promise<boolean> {
  const messageId = String(input.messageId)
  if (messageId.startsWith('pending-') || messageId.startsWith('-')) {
    throw new Error('Pesan belum terkirim.')
  }

  const { data: existing, error: findError } = await supabase
    .from('starred_messages')
    .select('id')
    .eq('user_id', input.userId)
    .eq('chat_type', input.chatType)
    .eq('message_id', messageId)
    .maybeSingle()
  if (findError) throw findError

  if (existing) {
    const { error } = await supabase
      .from('starred_messages')
      .delete()
      .eq('id', (existing as { id: number }).id)
    if (error) throw error
    return false
  }

  const { error } = await supabase.from('starred_messages').insert({
    user_id: input.userId,
    chat_type: input.chatType,
    chat_id: input.chatId,
    message_id: messageId,
  })
  if (error) throw error
  return true
}
