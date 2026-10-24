import { supabase } from '@/lib/supabase'
import { sendPrivateMessage } from '@/lib/api/messages'
import { sendRoomMedia } from '@/lib/api/groups'
import type { Message } from '@/lib/types'

/**
 * Teruskan pesan ke chat lain / grup.
 *
 * Kontrak sama dengan Android (`chat_selection_mixin`): pesan baru dengan
 * `is_forwarded = true`, tipe dipertahankan, dan `poll` diturunkan menjadi
 * `text`. Media hanya menyalin PATH storage (tidak mengunggah ulang).
 */
export async function forwardMessage({
  message,
  target,
  sender,
}: {
  message: Message
  target: { kind: 'chat'; chatId: string } | { kind: 'room'; roomId: string }
  sender: { uid: string; name: string; gender: string | null }
}): Promise<void> {
  const type = message.type === 'poll' ? 'text' : message.type
  const text = message.text ?? ''
  const imagePath = message.image_path ?? message.image_data ?? null
  const voicePath = message.voice_path ?? null

  if (target.kind === 'chat') {
    await sendPrivateMessage({
      chatId: target.chatId,
      senderId: sender.uid,
      senderName: sender.name,
      senderGender: sender.gender ?? 'other',
      text,
      type,
      imagePath: imagePath ?? undefined,
      voicePath: voicePath ?? undefined,
      videoPoster: message.video_poster ?? undefined,
      durationMs: message.duration_ms ?? undefined,
      isForwarded: true,
    })
    return
  }

  // Grup: tipe media terbatas pada yang didukung `sendRoomMedia`.
  const roomType = (
    ['image', 'video', 'file', 'voice', 'location', 'sticker'].includes(type) ? type : 'text'
  ) as 'image' | 'video' | 'file' | 'voice' | 'location' | 'sticker' | 'text'

  if (roomType === 'text') {
    const { error } = await supabase.from('messages').insert({
      room_id: target.roomId,
      sender_id: sender.uid,
      sender_name: sender.name,
      sender_gender: sender.gender ?? '',
      text,
      type: 'text',
      image_data: '',
      is_forwarded: true,
    })
    if (error) throw error
    return
  }

  await sendRoomMedia({
    roomId: target.roomId,
    senderId: sender.uid,
    senderName: sender.name,
    senderGender: sender.gender ?? null,
    type: roomType,
    text,
    imagePath: roomType === 'voice' ? undefined : (imagePath ?? undefined),
    voicePath: roomType === 'voice' ? (voicePath ?? imagePath ?? undefined) : undefined,
    videoPoster: message.video_poster ?? undefined,
    durationMs: message.duration_ms ?? undefined,
    isForwarded: true,
  })
}
