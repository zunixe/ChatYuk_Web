import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { sendPrivateMessage } from '@/lib/api/messages'
import { enqueueOutbox, isNetworkError } from '@/lib/outbox'
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
  collectMentions,
}: {
  chatId: string | undefined
  myUid: string | undefined
  senderName: string
  senderGender: string
  otherBlocked: boolean
  onTyping: () => void
  onStopTyping: () => void
  onSent: () => void
  /** Mention yang dipilih pengguna (dikirim sebagai jsonb `mentions`). */
  collectMentions?: () => Array<{ uid: string; name: string }>
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
    element.style.height = `${Math.max(40, Math.min(element.scrollHeight, 96))}px`
  }, [text])

  // Reset saat ganti chat. Sengaja memakai effect: state harus benar-benar
  // kosong SEBELUM interaksi pertama di chat baru (draft tidak boleh bocor).
  // Lint menandai ini sebagai saran optimasi, bukan bug.
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

    const mentions = collectMentions?.() ?? []
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
        mentions: mentions.length ? mentions : undefined,
      })
      replaceOptimisticMessage(queryClient, chatId, temp, server)
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      onSent()
      return true
    } catch (error) {
      // Offline: simpan ke antrean agar tidak hilang saat reload, dan kirim
      // otomatis begitu koneksi kembali (lihat useOutboxFlush).
      if (isNetworkError(error)) {
        try {
          await enqueueOutbox({
            chatId,
            senderId: myUid,
            senderName,
            senderGender,
            text: clean,
            type: 'text',
            repliedToId: reply?.id ?? null,
            repliedToText: reply ? messagePreview(reply) : null,
            repliedToSenderName: reply ? senderNameOf(reply) : null,
            createdAt: now,
          })
          toast.info('Tidak ada koneksi. Pesan akan dikirim otomatis.')
          return true
        } catch {
          // gagal simpan antrean → lanjut ke jalur error biasa
        }
      }
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
