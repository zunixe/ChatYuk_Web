import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

async function fetchBlockedUids(uid: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', uid)
  if (error) throw error
  return ((data ?? []) as Array<{ blocked_id: string }>).map((row) => row.blocked_id)
}

export function useBlockedUids(uid: string | undefined): string[] {
  const query = useQuery({
    queryKey: ['blocks', uid],
    queryFn: () => fetchBlockedUids(uid as string),
    enabled: Boolean(uid),
  })
  return query.data ?? []
}

export function useBlockedSet(uid: string | undefined): Set<string> {
  return new Set(useBlockedUids(uid))
}

export function useSetBlocked(myUid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ otherUid, blocked }: { otherUid: string; blocked: boolean }) => {
      if (!myUid) throw new Error('Sesi tidak ditemukan.')
      if (blocked) {
        const { error } = await supabase
          .from('blocks')
          .upsert(
            { blocker_id: myUid, blocked_id: otherUid },
            { onConflict: 'blocker_id,blocked_id' },
          )
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', myUid)
          .eq('blocked_id', otherUid)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks', myUid] })
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
    },
  })
}
