import { supabase } from '@/lib/supabase'

/**
 * Kontak & permintaan teman — paritas Android `contact_service.dart` dan
 * `social_service.dart` (friend request).
 */

export interface FriendRequest {
  id: number
  uid: string
  nickname: string
  avatar: string
  gender: string
  status: 'pending' | 'accepted' | 'rejected' | string
  createdAt: string
  isRegistered: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function mapRequest(raw: unknown): FriendRequest {
  const row = asRecord(raw)
  return {
    id: asNumber(row.id),
    uid: asString(row.uid),
    nickname: asString(row.nickname, 'Anon'),
    avatar: asString(row.avatar),
    gender: asString(row.gender),
    status: asString(row.status, 'pending'),
    createdAt: asString(row.created_at),
    isRegistered: Boolean(row.is_registered),
  }
}

/**
 * Kirim pesan ke tim ChatYuk. Insert langsung ke `contact_messages`
 * (policy mengizinkan user terautentikasi; `user_id` = pengirim).
 */
export async function submitContactMessage(input: {
  userId: string | null
  name?: string
  message: string
}): Promise<void> {
  const message = input.message.trim()
  if (!message) throw new Error('Pesan wajib diisi.')
  if (message.length > 2000) throw new Error('Pesan maksimal 2000 karakter.')
  const { error } = await supabase.from('contact_messages').insert({
    name: input.name?.trim() ? input.name.trim() : null,
    message,
    user_id: input.userId,
  })
  if (error) throw error
}

export async function sendFriendRequest(targetUid: string): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc('send_friend_request', { p_to: targetUid })
  if (error) throw error
  return { status: asString(asRecord(data).status, 'pending') }
}

export async function respondFriendRequest(requestId: number, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_friend_request', {
    p_request_id: requestId,
    p_accept: accept,
  })
  if (error) throw error
}

export async function cancelFriendRequest(requestId: number): Promise<void> {
  const { error } = await supabase.rpc('cancel_friend_request', { p_request_id: requestId })
  if (error) throw error
}

export async function fetchFriendRequests(
  kind: 'inbox' | 'outbox',
): Promise<FriendRequest[]> {
  const rpc = kind === 'inbox' ? 'friend_request_inbox_page' : 'friend_request_outbox_page'
  const { data, error } = await supabase.rpc(rpc, { p_limit: 50, p_offset: 0 })
  if (error) throw error
  return (Array.isArray(data) ? data : []).map(mapRequest)
}
