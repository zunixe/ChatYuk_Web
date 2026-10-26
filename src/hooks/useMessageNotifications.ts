import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useChats } from '@/hooks/useChatData'
import { chatDisplayName, otherParticipant } from '@/lib/api/chats'
import { notificationsEnabled, showLocalNotification } from '@/lib/notifications'
import type { Chat } from '@/lib/types'

/**
 * Notifikasi LOKAL untuk pesan masuk (B11).
 *
 * Aturan:
 * - Hanya saat tab disembunyikan (`document.hidden`) — kalau tab aktif,
 *   pengguna sudah melihat pesan di UI.
 * - Hanya untuk chat yang TIDAK sedang dibuka.
 * - Snapshot pertama tidak menotifikasi (mencegah banjir saat halaman dimuat).
 * - Mengandalkan realtime `useChatListRealtime` yang sudah memutakhirkan
 *   cache `['chats', uid]`.
 */
export function useMessageNotifications(myUid: string | undefined, activeChatId?: string) {
  const { t } = useTranslation()
  const chats = useChats(myUid)
  const snapshot = useRef<Map<string, string> | null>(null)
  const activeRef = useRef(activeChatId)

  useEffect(() => {
    activeRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    const list: Chat[] = chats.data ?? []
    const next = new Map<string, string>()
    for (const chat of list) {
      next.set(chat.chat_id, `${chat.last_message_at ?? ''}|${chat.message_count ?? 0}`)
    }

    const previous = snapshot.current
    snapshot.current = next

    // Snapshot pertama hanya dijadikan baseline.
    if (!previous) return
    if (!notificationsEnabled()) return
    if (typeof document === 'undefined' || !document.hidden) return
    if (!myUid) return

    for (const chat of list) {
      const key = next.get(chat.chat_id)
      const before = previous.get(chat.chat_id)
      if (key === before) continue
      if (chat.chat_id === activeRef.current) continue
      const sender = otherParticipant(chat, myUid)
      if (chat.participants.includes(myUid) === false) continue

      showLocalNotification({
        title: chat.participant_names?.[sender]?.trim() || chatDisplayName(chat, myUid),
        body: (chat.last_message ?? '').trim() || t('chat.newMessage'),
        tag: chat.chat_id,
        url: `/chats/${chat.chat_id}`,
      })
    }
  }, [chats.data, myUid, t])
}
