import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Message } from '@/lib/types'

/**
 * Semua logika scroll ruang chat:
 * - stick-to-bottom saat pesan baru masuk
 * - pertahankan posisi saat halaman lama dimuat (infinite scroll ke atas)
 * - tombol "pesan baru" saat pengguna sedang scroll ke atas
 */
export function useChatScroll({
  chatId,
  messages,
  myUid,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isTyping,
}: {
  chatId: string | undefined
  messages: Message[]
  myUid: string | undefined
  isLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  isTyping: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const initializedRef = useRef(false)
  const pendingOlderRef = useRef(false)
  const prevScrollHeightRef = useRef(0)
  const prevCountRef = useRef(0)
  const [showJump, setShowJump] = useState(false)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior })
    stickRef.current = true
    setShowJump(false)
  }, [])

  // Reset saat pindah chat (refs + satu state).
  useEffect(() => {
    initializedRef.current = false
    pendingOlderRef.current = false
    prevCountRef.current = 0
    stickRef.current = true
    setShowJump(false)
  }, [chatId])

  useEffect(() => {
    if (isTyping && stickRef.current) scrollToBottom('smooth')
  }, [isTyping, scrollToBottom])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || isLoading) return
    const count = messages.length

    if (!initializedRef.current) {
      element.scrollTop = element.scrollHeight
      initializedRef.current = true
      prevCountRef.current = count
      return
    }

    if (pendingOlderRef.current) {
      const delta = element.scrollHeight - prevScrollHeightRef.current
      element.scrollTop += Math.max(0, delta)
      pendingOlderRef.current = false
      prevCountRef.current = count
      return
    }

    const grew = count > prevCountRef.current
    const last = messages[count - 1]
    if (stickRef.current) {
      element.scrollTop = element.scrollHeight
    } else if (grew && last && last.sender_id !== myUid) {
      setShowJump(true)
    }
    prevCountRef.current = count
  }, [isLoading, messages, myUid])

  const handleScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight
    stickRef.current = distance < 150
    if (distance < 150) setShowJump(false)
    if (element.scrollTop < 70 && hasNextPage && !isFetchingNextPage) {
      prevScrollHeightRef.current = element.scrollHeight
      pendingOlderRef.current = true
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  /** Muat halaman lebih lama tanpa mengubah posisi baca pengguna. */
  const loadOlder = useCallback(() => {
    const element = scrollRef.current
    if (element) {
      prevScrollHeightRef.current = element.scrollHeight
      pendingOlderRef.current = true
    }
    fetchNextPage()
  }, [fetchNextPage])

  return {
    scrollRef,
    stickRef,
    showJump,
    setShowJump,
    scrollToBottom,
    handleScroll,
    loadOlder,
  }
}
