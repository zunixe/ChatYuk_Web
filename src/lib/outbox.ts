import { db, type OutboxItem } from '@/lib/db'
import { sendPrivateMessage } from '@/lib/api/messages'
import { isNetworkError } from '@/lib/network-error'
import type { Message } from '@/lib/types'

export { isNetworkError }

export async function enqueueOutbox(
  item: Omit<OutboxItem, 'id' | 'attempts' | 'createdAt'> & { createdAt?: string },
): Promise<number> {
  return db.outbox.add({
    ...item,
    createdAt: item.createdAt ?? new Date().toISOString(),
    attempts: 0,
  })
}

export async function outboxCount(): Promise<number> {
  return db.outbox.count()
}

export async function outboxAll(): Promise<OutboxItem[]> {
  return db.outbox.orderBy('id').toArray()
}

/** Kirim ulang semua pesan antrean. Mengembalikan jumlah yang berhasil. */
export async function flushOutbox(): Promise<{
  sent: number
  remaining: number
  sentMessages: Message[]
}> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, remaining: await db.outbox.count(), sentMessages: [] }
  }

  const items = await outboxAll()
  let sent = 0
  const sentMessages: Message[] = []

  for (const item of items) {
    try {
      const message = await sendPrivateMessage({
        chatId: item.chatId,
        senderId: item.senderId,
        senderName: item.senderName,
        senderGender: item.senderGender,
        text: item.text,
        type: item.type,
        imagePath: item.imagePath,
        voicePath: item.voicePath,
        videoPoster: item.videoPoster,
        durationMs: item.durationMs,
        repliedToId: item.repliedToId ?? null,
        repliedToText: item.repliedToText ?? null,
        repliedToSenderName: item.repliedToSenderName ?? null,
      })
      if (item.id != null) await db.outbox.delete(item.id)
      sent += 1
      sentMessages.push(message)
    } catch (error) {
      if (item.id != null) {
        await db.outbox.update(item.id, {
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        })
      }
      // Berhenti pada error jaringan pertama; error lain tetap dilewati.
      if (isNetworkError(error)) break
    }
  }

  return { sent, remaining: await db.outbox.count(), sentMessages }
}

export async function clearOutbox(): Promise<void> {
  await db.outbox.clear()
}
