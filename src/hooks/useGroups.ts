import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMyGroups,
  fetchMyPoints,
  fetchRoom,
  fetchRoomExplore,
  fetchRoomMessages,
  fetchRoomPricing,
  isRoomMember,
  joinRoom,
  leaveRoom,
  markRoomRead,
  sendRoomMessage,
} from '@/lib/api/groups'

const ROOM_PAGE_SIZE = 50

export function useMyGroups(myUid: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'mine', myUid],
    enabled: Boolean(myUid),
    refetchOnWindowFocus: true,
    queryFn: () => fetchMyGroups(myUid as string),
  })
}

export function useRoomExplore(country: string | undefined, myUid: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'explore', country, myUid],
    enabled: Boolean(country),
    queryFn: () => fetchRoomExplore(country as string, myUid),
  })
}

export function useRoomPricing() {
  return useQuery({
    queryKey: ['groups', 'pricing'],
    staleTime: 5 * 60 * 1000,
    queryFn: fetchRoomPricing,
  })
}

export function useMyPoints(uid: string | undefined) {
  return useQuery({
    queryKey: ['points', uid],
    enabled: Boolean(uid),
    queryFn: () => fetchMyPoints(uid as string),
  })
}

export function useRoom(roomId: string | undefined, myUid: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'room', roomId, myUid],
    enabled: Boolean(roomId),
    queryFn: () => fetchRoom(roomId as string, myUid),
  })
}

export function useRoomMembership(roomId: string | undefined, myUid: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'member', roomId, myUid],
    enabled: Boolean(roomId && myUid),
    queryFn: () => isRoomMember(roomId as string, myUid as string),
  })
}

export function useRoomMessages(roomId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['groups', 'messages', roomId],
    enabled: Boolean(roomId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => fetchRoomMessages(roomId as string, ROOM_PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.length < ROOM_PAGE_SIZE ? undefined : lastPage[0]?.id,
  })
}

export function useJoinRoom(myUid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, password }: { roomId: string; password?: string }) =>
      joinRoom(roomId, password),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', 'mine', myUid] })
      void queryClient.invalidateQueries({ queryKey: ['groups', 'member'] })
      void queryClient.invalidateQueries({ queryKey: ['points', myUid] })
    },
  })
}

export function useLeaveRoom(myUid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) => leaveRoom(roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', 'mine', myUid] })
      void queryClient.invalidateQueries({ queryKey: ['groups', 'member'] })
    },
  })
}

export function useSendRoomMessage(roomId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof sendRoomMessage>[0]) => sendRoomMessage(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', 'messages', roomId] })
      void queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] })
    },
  })
}

export function useMarkRoomRead() {
  return useMutation({
    mutationFn: (roomId: string) => markRoomRead(roomId),
  })
}
