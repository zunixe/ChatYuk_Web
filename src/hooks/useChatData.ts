import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  chatUnreadCount,
  getChat,
  listChats,
  otherParticipant,
  sortChats,
} from '@/lib/api/chats'
import {
  MESSAGE_PAGE_SIZE,
  fetchReactions,
  listMessages,
  mergeMessages,
} from '@/lib/api/messages'
import {
  fetchAvatars,
  fetchOnlineUsers,
  fetchPresence,
  fetchProfile,
  searchProfiles,
} from '@/lib/api/profiles'
import { db, readCachedChats } from '@/lib/db'
import type { Chat, Message, Reaction } from '@/lib/types'

export function useChats(myUid: string | undefined) {
  return useQuery({
    queryKey: ['chats', myUid],
    enabled: Boolean(myUid),
    queryFn: async () => {
      if (!myUid) return []
      try {
        return sortChats(await listChats(myUid), myUid)
      } catch (error) {
        const cached = await readCachedChats()
        if (cached.length > 0) return sortChats(cached, myUid)
        throw error
      }
    },
  })
}

export function useChat(chatId: string | undefined) {
  return useQuery({
    queryKey: ['chat', chatId],
    enabled: Boolean(chatId),
    queryFn: async () => {
      if (!chatId) return null
      try {
        return await getChat(chatId)
      } catch (error) {
        const cached = await db.chats.get(chatId)
        if (cached) return cached
        throw error
      }
    },
  })
}

export function useMessages(chatId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: ['messages', chatId],
    enabled: Boolean(chatId),
    queryFn: ({ pageParam }) => {
      if (!chatId) return Promise.resolve([] as Message[])
      return listMessages(chatId, pageParam)
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: Message[]) =>
      lastPage.length === MESSAGE_PAGE_SIZE ? (lastPage[0]?.created_at ?? null) : null,
  })

  const messages = useMemo(() => {
    const pages = query.data?.pages ?? []
    if (pages.length === 0) return []
    return mergeMessages([], pages.flat())
  }, [query.data])

  return { ...query, messages }
}

export function useReactions(chatId: string | undefined) {
  const query = useQuery({
    queryKey: ['reactions', chatId],
    enabled: Boolean(chatId),
    queryFn: () => (chatId ? fetchReactions(chatId) : Promise.resolve([] as Reaction[])),
    staleTime: 10_000,
  })

  const byMessage = useMemo(() => {
    const map = new Map<string, Reaction[]>()
    for (const reaction of query.data ?? []) {
      const key = String(reaction.message_id)
      const list = map.get(key)
      if (list) list.push(reaction)
      else map.set(key, [reaction])
    }
    return map
  }, [query.data])

  return { ...query, byMessage }
}

export function useParticipantsMeta(chats: Chat[], myUid: string | undefined) {
  const uids = useMemo(() => {
    if (!myUid) return []
    return Array.from(
      new Set(chats.map((chat) => otherParticipant(chat, myUid)).filter(Boolean)),
    ).sort()
  }, [chats, myUid])

  const key = uids.join(',')

  const avatars = useQuery({
    queryKey: ['avatars', key],
    enabled: uids.length > 0,
    queryFn: () => fetchAvatars(uids),
    staleTime: 5 * 60_000,
  })

  const presence = useQuery({
    queryKey: ['presence', key],
    enabled: uids.length > 0,
    queryFn: () => fetchPresence(uids),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  return {
    avatars: avatars.data ?? {},
    presence: presence.data ?? {},
  }
}

export function useOtherProfile(uid: string | undefined) {
  return useQuery({
    queryKey: ['profile', uid],
    enabled: Boolean(uid),
    queryFn: () => (uid ? fetchProfile(uid) : Promise.resolve(null)),
    staleTime: 20_000,
    refetchInterval: 45_000,
  })
}

export function useOnlineUsers(country?: string | null) {
  return useQuery({
    queryKey: ['online-users', country ?? 'all'],
    queryFn: () => fetchOnlineUsers(country),
    staleTime: 20_000,
    refetchInterval: 45_000,
  })
}

export function useUserSearch(term: string, myUid: string | undefined) {
  const clean = term.trim()
  return useQuery({
    queryKey: ['search-users', clean, myUid],
    enabled: clean.length >= 2 && Boolean(myUid),
    queryFn: () => (myUid ? searchProfiles(clean, myUid) : Promise.resolve([])),
    staleTime: 20_000,
  })
}

export function unreadTotal(chats: Chat[], myUid: string): number {
  return chats.reduce((total, chat) => total + chatUnreadCount(chat, myUid), 0)
}

export function useAvatars(uids: string[]) {
  const key = [...uids].filter(Boolean).sort().join(',')
  return useQuery({
    queryKey: ['avatars', key],
    enabled: uids.length > 0,
    queryFn: () => fetchAvatars(uids),
    staleTime: 5 * 60_000,
  })
}

export function usePresenceFor(uids: string[]) {
  const key = [...uids].filter(Boolean).sort().join(',')
  return useQuery({
    queryKey: ['presence', key],
    enabled: uids.length > 0,
    queryFn: () => fetchPresence(uids),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
