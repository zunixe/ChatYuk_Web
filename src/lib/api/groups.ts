import { supabase } from '@/lib/supabase'

/**
 * Kontrak GRUP (room privat) — paritas Android (`room_service.dart`).
 *
 * Catatan penting:
 * - "Grup" di ChatYuk = room dengan `is_private = true` pada tabel `rooms`.
 * - Pesan grup disimpan di tabel `messages` (kolom `room_id`), BUKAN
 *   `private_messages`.
 * - `get_room_messages()` TIDAK bisa dieksekusi `authenticated` (khusus
 *   admin). Anggota membaca langsung dari tabel `messages`; policy
 *   `messages_select` menjamin hanya anggota yang bisa melihat.
 * - Pembuatan grup berbayar poin dan dipotong di server (RPC), bukan klien.
 */

export interface Room {
  id: string
  name: string
  description: string
  icon: string
  order: number
  unread: number
  country: string
  category: string
  isPrivate: boolean
  ownerId: string | null
  ownerName: string | null
  hasPassword: boolean
  approvalRequired: boolean
  maxMembers: number | null
  expiresAt: string | null
  createdAt: string
  lastAt: string | null
  lastText: string | null
  lastType: string | null
  lastSenderName: string | null
  liveUid: string | null
  muted: boolean
}

export interface RoomPricing {
  joinPaid: number
  createPaid: number
  createPwPaid: number
  extendPaid: number
  multiplier: number
}

export interface RoomMessage {
  id: number
  roomId: string
  senderId: string
  senderName: string
  senderGender: string | null
  text: string | null
  type: string
  imagePath: string | null
  isDeleted: boolean
  edited: boolean
  repliedToId: number | null
  repliedToText: string | null
  repliedToSenderName: string | null
  createdAt: string | null
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

function mapRoom(raw: unknown, myUid?: string): Room {
  const row = asRecord(raw)
  const mutedBy = Array.isArray(row.muted_by) ? (row.muted_by as unknown[]) : []
  return {
    id: asString(row.id),
    name: asString(row.name),
    description: asString(row.description),
    icon: asString(row.icon, '💬'),
    order: asNumber(row.order),
    unread: asNumber(row.unread),
    country: asString(row.country),
    category: asString(row.category),
    isPrivate: Boolean(row.is_private),
    ownerId: typeof row.owner_id === 'string' ? row.owner_id : null,
    ownerName: typeof row.owner_name === 'string' ? row.owner_name : null,
    hasPassword: Boolean(row.has_password),
    approvalRequired: Boolean(row.approval_required),
    maxMembers: typeof row.max_members === 'number' ? row.max_members : null,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
    createdAt: asString(row.created_at),
    lastAt: typeof row.last_at === 'string' ? row.last_at : null,
    lastText: typeof row.last_text === 'string' ? row.last_text : null,
    lastType: typeof row.last_type === 'string' ? row.last_type : null,
    lastSenderName: typeof row.last_sender_name === 'string' ? row.last_sender_name : null,
    liveUid: typeof row.live_uid === 'string' ? row.live_uid : null,
    muted: myUid ? mutedBy.includes(myUid) : false,
  }
}

function mapMessage(raw: unknown): RoomMessage {
  const row = asRecord(raw)
  return {
    id: asNumber(row.id),
    roomId: asString(row.room_id),
    senderId: asString(row.sender_id),
    senderName: asString(row.sender_name),
    senderGender: typeof row.sender_gender === 'string' ? row.sender_gender : null,
    text: typeof row.text === 'string' ? row.text : null,
    type: asString(row.type, 'text'),
    imagePath: typeof row.image_path === 'string' ? row.image_path : null,
    isDeleted: Boolean(row.is_deleted),
    edited: Boolean(row.edited),
    repliedToId: typeof row.replied_to_id === 'number' ? row.replied_to_id : null,
    repliedToText: typeof row.replied_to_text === 'string' ? row.replied_to_text : null,
    repliedToSenderName:
      typeof row.replied_to_sender_name === 'string' ? row.replied_to_sender_name : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  }
}

/** Grup yang saya ikuti (tab Grup di Android). */
export async function fetchMyGroups(uid: string, myUid?: string): Promise<Room[]> {
  const { data, error } = await supabase.rpc('list_my_groups', { p_uid: uid })
  if (error) throw error
  return (Array.isArray(data) ? data : []).map((row) => mapRoom(row, myUid ?? uid))
}

/** Grup + global room untuk negara tertentu (tab Explore). */
export async function fetchRoomExplore(country: string, myUid?: string): Promise<Room[]> {
  const { data, error } = await supabase.rpc('list_room_explore', { p_country: country })
  if (error) throw error
  return (Array.isArray(data) ? data : []).map((row) => mapRoom(row, myUid))
}

export async function fetchRoomPricing(): Promise<RoomPricing> {
  const { data, error } = await supabase.rpc('room_pricing')
  if (error) throw error
  const row = asRecord(data)
  return {
    joinPaid: asNumber(row.join_paid),
    createPaid: asNumber(row.create_paid),
    createPwPaid: asNumber(row.create_pw_paid),
    extendPaid: asNumber(row.extend_paid),
    multiplier: asNumber(row.multiplier, 1),
  }
}

/** Detail satu grup (untuk header room & cek keanggotaan). */
export async function fetchRoom(roomId: string, myUid?: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select(
      'id, name, description, icon, "order", country, category, is_private, owner_id, owner_name, has_password, approval_required, max_members, expires_at, created_at, muted_by',
    )
    .eq('id', roomId)
    .maybeSingle()
  if (error) throw error
  return data ? mapRoom(data, myUid) : null
}

/** Apakah saya anggota grup ini? (dipakai sebelum menampilkan room chat) */
export async function isRoomMember(roomId: string, uid: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('room_id', roomId)
    .eq('user_id', uid)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

/**
 * Masuk grup. Biaya poin (bila ada) dipotong server.
 * Return `{ ok, charged, points }` seperti Android.
 */
export async function joinRoom(
  roomId: string,
  password?: string,
): Promise<{ ok: boolean; charged: number; points: number }> {
  const { data, error } = await supabase.rpc('join_private_room', {
    p_room_id: roomId,
    p_password: password?.trim() ? password.trim() : null,
  })
  if (error) throw error
  const row = asRecord(data)
  return {
    ok: Boolean(row.ok),
    charged: asNumber(row.charged),
    points: asNumber(row.points),
  }
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_private_room', { p_room_id: roomId })
  if (error) throw error
}

export async function markRoomRead(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_room_read', { p_room_id: roomId })
  if (error) throw error
}

/**
 * Ambil pesan grup. `beforeId` untuk paginasi ke atas (lebih lama).
 * Policy `messages_select` membatasi hanya anggota grup privat.
 */
export async function fetchRoomMessages(
  roomId: string,
  limit = 50,
  beforeId?: number,
): Promise<RoomMessage[]> {
  let query = supabase
    .from('messages')
    .select(
      'id, room_id, sender_id, sender_name, sender_gender, text, type, image_path, is_deleted, edited, replied_to_id, replied_to_text, replied_to_sender_name, created_at',
    )
    .eq('room_id', roomId)
    .order('id', { ascending: false })
    .limit(limit)
  if (beforeId) query = query.lt('id', beforeId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapMessage).reverse()
}

/** Kirim pesan teks ke grup (kontrak sama dengan `ChatService.sendRoomMessage`). */
export async function sendRoomMessage(input: {
  roomId: string
  senderId: string
  senderName: string
  senderGender: string | null
  text: string
  repliedToId?: number
  repliedToText?: string
  repliedToSenderName?: string
}): Promise<void> {
  const text = input.text.trim()
  if (!text) throw new Error('Pesan tidak boleh kosong.')
  if (text.length > 2000) throw new Error('Pesan maksimal 2000 karakter.')

  const { error } = await supabase.from('messages').insert({
    room_id: input.roomId,
    sender_id: input.senderId,
    sender_name: input.senderName,
    sender_gender: input.senderGender ?? '',
    text,
    type: 'text',
    ...(input.repliedToId ? { replied_to_id: input.repliedToId } : {}),
    ...(input.repliedToText ? { replied_to_text: input.repliedToText } : {}),
    ...(input.repliedToSenderName
      ? { replied_to_sender_name: input.repliedToSenderName }
      : {}),
  })
  if (error) throw error
}

/** Saldo poin saya (cermin ledger; server sumber kebenaran). */
export async function fetchMyPoints(uid: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', uid)
    .maybeSingle()
  if (error) throw error
  return asNumber(asRecord(data).points)
}
