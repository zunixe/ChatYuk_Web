import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { mergeMessages } from '@/lib/api/messages'
import type { Chat, Message } from '@/lib/types'

export type MessagePages = InfiniteData<Message[], string | null>

function updatePages(
  queryClient: QueryClient,
  chatId: string,
  updater: (pages: Message[][]) => Message[][],
): void {
  queryClient.setQueryData<MessagePages>(['messages', chatId], (old) => {
    if (!old) return old
    return { ...old, pages: updater(old.pages) }
  })
}

export function addOptimisticMessage(
  queryClient: QueryClient,
  chatId: string,
  message: Message,
): void {
  queryClient.setQueryData<MessagePages>(['messages', chatId], (old) => {
    if (!old) {
      return { pages: [[message]], pageParams: [null] }
    }
    return {
      ...old,
      pages: old.pages.map((page, index) =>
        index === 0 ? mergeMessages(page, [message]) : page,
      ),
    }
  })
}

export function replaceOptimisticMessage(
  queryClient: QueryClient,
  chatId: string,
  tempId: string,
  serverMessage: Message,
): void {
  queryClient.setQueryData<MessagePages>(['messages', chatId], (old) => {
    if (!old) return old
    return {
      ...old,
      pages: old.pages.map((page) => {
        const withoutTemp = page.filter((message) => message.temp_id !== tempId)
        return mergeMessages(withoutTemp, [serverMessage])
      }),
    }
  })
}

export function failOptimisticMessage(
  queryClient: QueryClient,
  chatId: string,
  tempId: string,
): void {
  updatePages(queryClient, chatId, (pages) =>
    pages.map((page) =>
      page.map((message) =>
        message.temp_id === tempId ? { ...message, client_status: 'failed' } : message,
      ),
    ),
  )
}

export function removeMessageFromCache(
  queryClient: QueryClient,
  chatId: string,
  messageId: number | string,
): void {
  updatePages(queryClient, chatId, (pages) =>
    pages.map((page) => page.filter((message) => String(message.id) !== String(messageId))),
  )
}

export function upsertMessageInCache(
  queryClient: QueryClient,
  chatId: string,
  message: Message,
): void {
  queryClient.setQueryData<MessagePages>(['messages', chatId], (old) => {
    if (!old) return old
    return {
      ...old,
      pages: old.pages.map((page, index) =>
        index === 0 ? mergeMessages(page, [message]) : page,
      ),
    }
  })
}

export function patchChatInCaches(
  queryClient: QueryClient,
  myUid: string,
  chatId: string,
  patch: Partial<Chat>,
): void {
  queryClient.setQueryData<Chat>(['chat', chatId], (old) =>
    old ? { ...old, ...patch } : old,
  )
  queryClient.setQueryData<Chat[]>(['chats', myUid], (old) =>
    old?.map((chat) => (chat.chat_id === chatId ? { ...chat, ...patch } : chat)),
  )
}

export function touchChatCache(
  queryClient: QueryClient,
  myUid: string,
  chatId: string,
  text: string,
  at: string,
): void {
  const chats = queryClient.getQueryData<Chat[]>(['chats', myUid])
  if (!chats) return
  const exists = chats.some((chat) => chat.chat_id === chatId)
  if (!exists) {
    void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
    return
  }
  queryClient.setQueryData<Chat[]>(['chats', myUid], (old) =>
    old
      ?.map((chat) =>
        chat.chat_id === chatId
          ? {
              ...chat,
              last_message: text,
              last_message_at: at,
              last_sender_id: myUid,
            }
          : chat,
      )
      .sort((a, b) => {
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        return timeB - timeA
      }),
  )
}

export function markChatReadInCache(
  queryClient: QueryClient,
  myUid: string,
  chatId: string,
): void {
  const at = new Date().toISOString()
  patchChatInCaches(queryClient, myUid, chatId, {
    unread_counts: {
      ...(queryClient.getQueryData<Chat>(['chat', chatId])?.unread_counts ?? {}),
      [myUid]: 0,
    },
    last_read_at: {
      ...(queryClient.getQueryData<Chat>(['chat', chatId])?.last_read_at ?? {}),
      [myUid]: at,
    },
  })
}
