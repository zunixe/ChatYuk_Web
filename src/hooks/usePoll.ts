import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PollResults {
  counts: number[]
  mine: number[]
  voters: number
}

function parseResults(raw: unknown): PollResults {
  const obj = (raw ?? {}) as Record<string, unknown>
  const counts = Array.isArray(obj.counts) ? obj.counts.map((n) => Number(n) || 0) : []
  const mine = Array.isArray(obj.mine) ? obj.mine.map((n) => Number(n)) : []
  const voters = Number(obj.voters ?? 0)
  return { counts, mine, voters: Number.isFinite(voters) ? voters : 0 }
}

/** Hasil vote untuk sekumpulan pesan poll (batch, lazy). */
export function usePollResults(messageIds: number[]) {
  const ids = messageIds.filter((id) => Number.isFinite(id) && id > 0)
  return useQuery({
    queryKey: ['poll-results', ids.join(',')],
    enabled: ids.length > 0,
    staleTime: 20_000,
    queryFn: async (): Promise<Record<string, PollResults>> => {
      const { data, error } = await supabase.rpc('get_poll_results', { p_message_ids: ids })
      if (error) throw error
      const map: Record<string, PollResults> = {}
      if (Array.isArray(data)) {
        for (const row of data as Array<Record<string, unknown>>) {
          // RPC mengembalikan field `id` (bukan `message_id`).
          const key = String(row.id ?? row.message_id ?? '')
          if (key) map[key] = parseResults(row)
        }
      } else if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
          map[key] = parseResults(value)
        }
      }
      return map
    },
  })
}

export function useVotePoll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ messageId, options }: { messageId: number; options: number[] }) => {
      const { data, error } = await supabase.rpc('vote_poll', {
        p_message_id: messageId,
        p_options: options,
      })
      if (error) throw error
      return parseResults(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['poll-results'] })
    },
  })
}
