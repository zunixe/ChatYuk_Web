import { useQuery } from '@tanstack/react-query'
import { fetchLedgerHistory, fetchPointsLeaderboard } from '@/lib/api/points'

export function usePointsLeaderboard(scope: 'weekly' | 'alltime') {
  return useQuery({
    queryKey: ['points', 'leaderboard', scope],
    staleTime: 60_000,
    queryFn: () => fetchPointsLeaderboard(scope),
  })
}

export function useLedgerHistory(uid: string | undefined) {
  return useQuery({
    queryKey: ['points', 'ledger', uid],
    enabled: Boolean(uid),
    queryFn: () => fetchLedgerHistory(100),
  })
}
