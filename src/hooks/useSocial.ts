import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelFriendRequest,
  fetchFriendRequests,
  respondFriendRequest,
  sendFriendRequest,
  submitContactMessage,
} from '@/lib/api/social'

export function useFriendRequests(kind: 'inbox' | 'outbox') {
  return useQuery({
    queryKey: ['friend-requests', kind],
    queryFn: () => fetchFriendRequests(kind),
  })
}

function useInvalidateRequests() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
  }
}

export function useRespondFriendRequest() {
  const invalidate = useInvalidateRequests()
  return useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      respondFriendRequest(id, accept),
    onSuccess: invalidate,
  })
}

export function useCancelFriendRequest() {
  const invalidate = useInvalidateRequests()
  return useMutation({
    mutationFn: (id: number) => cancelFriendRequest(id),
    onSuccess: invalidate,
  })
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateRequests()
  return useMutation({
    mutationFn: (targetUid: string) => sendFriendRequest(targetUid),
    onSuccess: invalidate,
  })
}

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (input: Parameters<typeof submitContactMessage>[0]) => submitContactMessage(input),
  })
}
