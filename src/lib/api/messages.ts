import { config } from '@/lib/runtime-config'
import { supabase } from '@/lib/supabase'
import { unhideChat } from '@/lib/api/chats'
import { cacheMessages } from '@/lib/db'
import type { Message, Reaction, SendMessageInput } from '@/lib/types'

export const MESSAGE_PAGE_SIZE = 30

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (timeDiff !== 0) return timeDiff
    return Number(a.id) - Number(b.id)
  })
}

export async function listMessages(
  chatId: string,
  beforeCreatedAt?: string | null,
): Promise<Message[]> {
  let query = supabase
    .from('private_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE)

  if (beforeCreatedAt) query = query.lt('created_at', beforeCreatedAt)

  const { data, error } = await query
  if (error) throw error
  const rows = sortMessages((data ?? []) as Message[])
  await cacheMessages(rows)
  return rows
}

export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>()
  for (const message of current) map.set(String(message.id), message)
  for (const message of incoming) {
    const key = String(message.id)
    const existing = map.get(key)
    map.set(key, existing ? { ...existing, ...message } : message)
  }
  return sortMessages(Array.from(map.values()))
}

export async function sendPrivateMessage(input: SendMessageInput): Promise<Message> {
  const text = input.text.trim()
  const type = input.type ?? 'text'
  if (type === 'text' && !text) throw new Error('Pesan kosong.')
  if (text.length > 2000) throw new Error('Message too long (max 2000 chars)')

  const payload: Record<string, unknown> = {
    chat_id: input.chatId,
    sender_id: input.senderId,
    sender_name: input.senderName,
    sender_gender: input.senderGender,
    text,
    type,
    image_data: '',
  }

  if (type === 'voice') {
    const voicePath = (input.voicePath ?? input.imagePath ?? '').trim()
    if (!voicePath) throw new Error('Pesan suara belum siap.')
    payload.voice_path = voicePath
  } else if (input.imagePath) {
    payload.image_data = input.imagePath
    payload.image_path = input.imagePath
  }
  if (input.videoPoster) payload.video_poster = input.videoPoster
  if (input.durationMs != null) payload.duration_ms = input.durationMs
  if (input.repliedToId != null) {
    payload.replied_to_id = input.repliedToId
    payload.replied_to_text = input.repliedToText ?? ''
    payload.replied_to_sender_name = input.repliedToSenderName ?? ''
  }

  if (!config.features.replyMeta) {
    delete payload.replied_to_meta
  }

  await unhideChat(input.chatId, input.senderId)

  const { data, error } = await supabase
    .from('private_messages')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  const message = data as Message
  await cacheMessages([message])
  return message
}

export async function fetchReactions(chatId: string): Promise<Reaction[]> {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('chat_type', 'private')
    .eq('chat_id', chatId)
    .limit(2000)
  if (error) throw error
  return (data ?? []) as Reaction[]
}

export async function toggleReaction(
  chatId: string,
  messageId: number | string,
  userId: string,
  emoji: string,
): Promise<boolean> {
  const { data: existing, error: findError } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('chat_type', 'private')
    .eq('chat_id', chatId)
    .eq('message_id', String(messageId))
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle()
  if (findError) throw findError

  if (existing?.id) {
    const { error } = await supabase.from('message_reactions').delete().eq('id', existing.id)
    if (error) throw error
    return false
  }

  const { error } = await supabase.from('message_reactions').insert({
    chat_type: 'private',
    chat_id: chatId,
    message_id: String(messageId),
    user_id: userId,
    emoji,
  })
  if (error && error.code !== '23505') throw error
  return true
}
