import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchPrivacyCandidates, type PersonOption } from '@/lib/api/privacy'
import { useChats } from '@/hooks/useChatData'

/**
 * Kandidat picker privasi: teman + following dari server, digabung riwayat
 * chat (gratis dari cache daftar chat) agar orang yang pernah di-chat tetap
 * bisa dikecualikan meski belum saling follow.
 */
export function usePrivacyCandidates(myUid: string | undefined): {
  people: PersonOption[]
  isLoading: boolean
  isError: boolean
} {
  const chatsQuery = useChats(myUid)

  const chatPeople = useMemo<PersonOption[]>(() => {
    const rows = chatsQuery.data ?? []
    const list: PersonOption[] = []
    for (const chat of rows) {
      for (const uid of chat.participants ?? []) {
        if (!myUid || uid === myUid) continue
        list.push({
          uid,
          nickname: chat.participant_names?.[uid]?.trim() || 'Pengguna',
          avatar: null,
          source: 'chat',
        })
      }
    }
    return list
  }, [chatsQuery.data, myUid])

  const query = useQuery({
    queryKey: ['privacy-candidates', myUid, chatPeople.length],
    enabled: Boolean(myUid),
    staleTime: 5 * 60_000,
    queryFn: () => fetchPrivacyCandidates(myUid as string, chatPeople),
  })

  return {
    people: query.data ?? chatPeople,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
