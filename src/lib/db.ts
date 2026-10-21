import Dexie, { type Table } from 'dexie'
import { config } from '@/lib/runtime-config'
import type { Chat, Message, Profile } from '@/lib/types'

export interface CachedMessage extends Message {
  cache_key: string
}

export interface OutboxItem {
  id?: number
  chatId: string
  senderId: string
  text: string
  createdAt: string
  attempts: number
}

class ChatYukDatabase extends Dexie {
  chats!: Table<Chat, string>
  messages!: Table<CachedMessage, string>
  profiles!: Table<Profile, string>
  outbox!: Table<OutboxItem, number>

  constructor() {
    super(`chatyuk-web-${config.env}`)
    this.version(1).stores({
      chats: 'chat_id, last_message_at',
      messages: 'cache_key, chat_id, created_at',
      profiles: 'id',
      outbox: '++id, chat_id, created_at',
    })
  }
}

export const db = new ChatYukDatabase()

export function messageCacheKey(chatId: string, id: number | string): string {
  return `${chatId}:${id}`
}

export async function cacheChats(chats: Chat[]): Promise<void> {
  try {
    await db.chats.bulkPut(chats)
  } catch {
    // Cache bersifat best-effort; jangan ganggu alur utama.
  }
}

export async function readCachedChats(): Promise<Chat[]> {
  try {
    return await db.chats.orderBy('last_message_at').reverse().toArray()
  } catch {
    return []
  }
}

export async function cacheMessages(messages: Message[]): Promise<void> {
  try {
    await db.messages.bulkPut(
      messages.map((message) => ({
        ...message,
        cache_key: messageCacheKey(message.chat_id, message.id),
      })),
    )
  } catch {
    // best-effort
  }
}

export async function readCachedMessages(chatId: string, limit = 60): Promise<Message[]> {
  try {
    const rows = await db.messages
      .where('chat_id')
      .equals(chatId)
      .reverse()
      .limit(limit)
      .toArray()
    return rows
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return diff !== 0 ? diff : a.id - b.id
      })
      .map(({ cache_key: _cacheKey, ...message }) => message)
  } catch {
    return []
  }
}

export async function cacheProfile(profile: Profile): Promise<void> {
  try {
    await db.profiles.put(profile)
  } catch {
    // best-effort
  }
}

export async function clearLocalData(): Promise<void> {
  try {
    await Promise.all([db.chats.clear(), db.messages.clear(), db.profiles.clear(), db.outbox.clear()])
  } catch {
    // ignore
  }
}
