import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { markChatRead } from '@/lib/api/chats'
import {
  markChatReadInCache,
  patchChatInCaches,
  removeMessageFromCache,
  upsertMessageInCache,
} from '@/lib/query-cache'
import { supabase } from '@/lib/supabase'
import type { Chat, Message } from '@/lib/types'

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function useChatListRealtime(uid: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!uid) return
    let timer: number | undefined
    const channel = supabase.channel(`web-chat-list-${uid}-${randomSuffix()}`)

    const refresh = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['chats', uid] })
      }, 180)
    }

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_chats' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_chats' }, refresh)
      .subscribe()

    return () => {
      if (timer) window.clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [queryClient, uid])
}

export function useChatRoomRealtime(
  chatId: string | undefined,
  myUid: string | undefined,
): { connected: boolean } {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!chatId || !myUid) return
    let disposed = false
    const channel = supabase.channel(`web-chat-room-${chatId}-${randomSuffix()}`)

    const readIfVisible = (message: Message) => {
      if (message.sender_id === myUid) return
      if (document.visibilityState !== 'visible') return
      void markChatRead(chatId, myUid)
        .then(() => {
          markChatReadInCache(queryClient, myUid, chatId)
          void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
        })
        .catch(() => undefined)
    }

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const message = payload.new as Message
          upsertMessageInCache(queryClient, chatId, message)
          void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
          readIfVisible(message)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'private_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          upsertMessageInCache(queryClient, chatId, payload.new as Message)
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'private_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const old = payload.old as Partial<Message>
          if (old?.id != null) removeMessageFromCache(queryClient, chatId, old.id)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'private_chats', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const chat = payload.new as Chat
          patchChatInCaches(queryClient, myUid, chatId, chat)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions', filter: `chat_id=eq.${chatId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['reactions', chatId] })
        },
      )
      .subscribe((status) => {
        if (disposed) return
        const isConnected = status === 'SUBSCRIBED'
        setConnected(isConnected)
        if (isConnected) {
          void queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
          void queryClient.invalidateQueries({ queryKey: ['reactions', chatId] })
          void queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
        }
      })

    return () => {
      disposed = true
      setConnected(false)
      void supabase.removeChannel(channel)
    }
  }, [chatId, myUid, queryClient])

  return { connected }
}

interface TypingPayload {
  sender_id?: string
  kind?: string
  ts?: number
}

export function useTyping(
  chatId: string | undefined,
  myUid: string | undefined,
): {
  typingUsers: string[]
  sendTyping: () => void
  stopTyping: () => void
} {
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastSentRef = useRef(0)
  const lastSeenRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!chatId || !myUid) return
    lastSeenRef.current = {}
    setTypingUsers([])

    const channel = supabase.channel(`typing-${chatId}`, {
      config: { broadcast: { self: false } },
    })
    channelRef.current = channel

    channel.on('broadcast', { event: 'typing' }, (event) => {
      const raw = (event.payload ?? {}) as TypingPayload
      const sender = raw.sender_id
      if (!sender || sender === myUid) return
      if (raw.kind === 'stop') {
        delete lastSeenRef.current[sender]
      } else {
        lastSeenRef.current[sender] = Date.now()
      }
      setTypingUsers(Object.keys(lastSeenRef.current))
    })

    channel.subscribe()

    const prune = window.setInterval(() => {
      const now = Date.now()
      let changed = false
      for (const [uid, at] of Object.entries(lastSeenRef.current)) {
        if (now - at > 4500) {
          delete lastSeenRef.current[uid]
          changed = true
        }
      }
      if (changed) setTypingUsers(Object.keys(lastSeenRef.current))
    }, 1200)

    return () => {
      window.clearInterval(prune)
      channelRef.current = null
      lastSeenRef.current = {}
      void supabase.removeChannel(channel)
    }
  }, [chatId, myUid])

  function sendTyping() {
    if (!chatId || !myUid) return
    const now = Date.now()
    if (now - lastSentRef.current < 1800) return
    lastSentRef.current = now
    const channel = channelRef.current
    if (!channel) return
    void channel
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: myUid, kind: 'typing', ts: now },
      })
      .catch(() => undefined)
  }

  function stopTyping() {
    if (!chatId || !myUid) return
    lastSentRef.current = 0
    const channel = channelRef.current
    if (!channel) return
    void channel
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: myUid, kind: 'stop', ts: Date.now() },
      })
      .catch(() => undefined)
  }

  return { typingUsers, sendTyping, stopTyping }
}
