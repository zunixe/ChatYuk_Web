import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushOutbox, outboxCount } from '@/lib/outbox'
import { upsertMessageInCache } from '@/lib/query-cache'

const FLUSH_INTERVAL_MS = 30_000

/**
 * Menjaga antrean pesan offline: hitung sisa, kirim ulang saat kembali online
 * dan berkala. Mengembalikan jumlah pesan yang masih menunggu.
 */
export function useOutboxFlush(myUid: string | undefined): {
  pending: number
  flushing: boolean
  flushNow: () => void
} {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(0)
  const [flushing, setFlushing] = useState(false)
  const busyRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      setPending(await outboxCount())
    } catch {
      // IndexedDB tidak tersedia (private mode) → abaikan.
    }
  }, [])

  const flushNow = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    setFlushing(true)
    void flushOutbox()
      .then((result) => {
        for (const message of result.sentMessages) {
          upsertMessageInCache(queryClient, message.chat_id, message)
        }
        if (myUid && result.sent > 0) {
          void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
        }
        setPending(result.remaining)
      })
      .catch(() => undefined)
      .finally(() => {
        busyRef.current = false
        setFlushing(false)
      })
  }, [myUid, queryClient])

  useEffect(() => {
    void refresh()
    const onOnline = () => flushNow()
    window.addEventListener('online', onOnline)
    const timer = window.setInterval(() => {
      if (navigator.onLine !== false) flushNow()
    }, FLUSH_INTERVAL_MS)
    return () => {
      window.removeEventListener('online', onOnline)
      window.clearInterval(timer)
    }
  }, [flushNow, refresh])

  return { pending, flushing, flushNow }
}
