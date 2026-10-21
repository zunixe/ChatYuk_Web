import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { sendPrivateMessage } from '@/lib/api/messages'
import { errorMessage } from '@/lib/errors'
import {
  addOptimisticMessage,
  failOptimisticMessage,
  replaceOptimisticMessage,
  touchChatCache,
} from '@/lib/query-cache'
import { messagePreview } from '@/lib/utils'
import type { Message } from '@/lib/types'

export const MAX_MESSAGE_LENGTH = 2000

function tempId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function senderNameOf(message: Message): string {
  return message.sender_name?.trim() || 'Pengguna'
}

/** Teks, reply, typing, dan pengiriman pesan teks. */
export function useChatComposer({
  chatId,
  myUid,
  senderName,
  senderGender,
  otherBlocked,
  onTyping,
  onStopTyping,
  onSent,
}: {
  chatId: string | undefined
  myUid: string | undefined
  senderName: string
  senderGender: string
  otherBlocked: boolean
  onTyping: () => void
  onStopTyping: () => void
  onSent: () => void
}) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea.
  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = '0px'
    element.style.height = `${Math.min(element.scrollHeight, 144)}px`
  }, [text])

  // Reset saat ganti chat.
  useEffect(() => {
    setText('')
    setReplyTo(null)
  }, [chatId])

  function handleTextChange(value: string) {
    setText(value.slice(0, MAX_MESSAGE_LENGTH))
    if (value.trim()) onTyping()
    else onStopTyping()
  }

  async function sendTextMessage(): Promise<boolean> {
    if (!chatId || !myUid) return false
    if (otherBlocked) {
      toast.error('Kamu memblokir pengguna ini. Buka info kontak untuk membuka blokir.')
      return false
    }
    const clean = text.trim()
    if (!clean) return false

    const temp = tempId()
    const reply = replyTo
    const now = new Date().toISOString()
    const optimistic: Message = {
      id: -Date.now(),
      chat_id: chatId,
      sender_id: myUid,
      sender_name: senderName,
      sender_gender: senderGender,
      text: clean,
      type: 'text',
      replied_to_id: reply?.id ?? null,
      replied_to_text: reply ? messagePreview(reply) : null,
      replied_to_sender_name: reply ? senderNameOf(reply) : null,
      created_at: now,
      client_status: 'sending',
      temp_id: temp,
    }

    addOptimisticMessage(queryClient, chatId, optimistic)
    touchChatCache(queryClient, myUid, chatId, clean, now)
    setText('')
    setReplyTo(null)
    onStopTyping()

    try {
      const server = await sendPrivateMessage({
        chatId,
        senderId: myUid,
        senderName,
        senderGender,
        text: clean,
        type: 'text',
        repliedToId: reply?.id ?? null,
        repliedToText: reply ? messagePreview(reply) : null,
        repliedToSenderName: reply ? senderNameOf(reply) : null,
      })
      replaceOptimisticMessage(queryClient, chatId, temp, server)
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      onSent()
      return true
    } catch (error) {
      failOptimisticMessage(queryClient, chatId, temp)
      toast.error(errorMessage(error))
      return false
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendTextMessage()
    }
  }

  return {
    text,
    setText,
    replyTo,
    setReplyTo,
    textareaRef,
    handleTextChange,
    sendTextMessage,
    handleKeyDown,
    senderNameOf,
  }
}
