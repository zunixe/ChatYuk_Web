import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveJoinRequest,
  createRoom,
  deleteRoom,
  extendRoom,
  fetchJoinRequests,
  fetchMyGroups,
  fetchMyRoomRole,
  fetchMyPoints,
  fetchRoom,
  fetchRoomExplore,
  fetchRoomMediaPaths,
  fetchRoomMembers,
  fetchRoomMessages,
  fetchRoomPricing,
  inviteToRoom,
  isRoomMember,
  joinRoom,
  kickRoomMember,
  leaveRoom,
  markRoomRead,
  rejectJoinRequest,
  resetRoomPassword,
  sendRoomMessage,
  setRoomMemberRole,
  updateRoomIcon,
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

export function useCreateRoom(myUid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createRoom>[0]) => createRoom(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups', 'mine', myUid] })
      void queryClient.invalidateQueries({ queryKey: ['groups', 'explore'] })
      void queryClient.invalidateQueries({ queryKey: ['points', myUid] })
    },
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

export function useMyRoomRole(roomId: string | undefined, myUid: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'role', roomId, myUid],
    enabled: Boolean(roomId && myUid),
    queryFn: () => fetchMyRoomRole(roomId as string, myUid as string),
  })
}

export function useRoomMembers(roomId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['groups', 'members', roomId],
    enabled: Boolean(roomId) && enabled,
    queryFn: () => fetchRoomMembers(roomId as string),
  })
}

export function useJoinRequests(roomId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['groups', 'requests', roomId],
    enabled: Boolean(roomId) && enabled,
    retry: false,
    queryFn: () => fetchJoinRequests(roomId as string),
  })
}

function useRoomInfoInvalidate(roomId: string | undefined, myUid: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['groups', 'members', roomId] })
    void queryClient.invalidateQueries({ queryKey: ['groups', 'requests', roomId] })
    void queryClient.invalidateQueries({ queryKey: ['groups', 'room', roomId] })
    void queryClient.invalidateQueries({ queryKey: ['groups', 'mine', myUid] })
    void queryClient.invalidateQueries({ queryKey: ['points', myUid] })
  }
}

export function useApproveJoinRequest(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: (uid: string) => approveJoinRequest(roomId as string, uid),
    onSuccess: invalidate,
  })
}

export function useRejectJoinRequest(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: (uid: string) => rejectJoinRequest(roomId as string, uid),
    onSuccess: invalidate,
  })
}

export function useKickRoomMember(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: (uid: string) => kickRoomMember(roomId as string, uid),
    onSuccess: invalidate,
  })
}

export function useInviteToRoom(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: (uid: string) => inviteToRoom(roomId as string, uid),
    onSuccess: invalidate,
  })
}

export function useSetRoomMemberRole(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: 'admin' | 'member' }) =>
      setRoomMemberRole(roomId as string, uid, role),
    onSuccess: invalidate,
  })
}

export function useUpdateRoomIcon(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: (icon: string) => updateRoomIcon(roomId as string, icon),
    onSuccess: invalidate,
  })
}

export function useResetRoomPassword(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: (newPassword: string | null) => resetRoomPassword(roomId as string, newPassword),
    onSuccess: invalidate,
  })
}

export function useExtendRoom(roomId: string | undefined, myUid: string | undefined) {
  const invalidate = useRoomInfoInvalidate(roomId, myUid)
  return useMutation({
    mutationFn: () => extendRoom(roomId as string),
    onSuccess: invalidate,
  })
}

export function useDeleteRoom(myUid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
      void queryClient.invalidateQueries({ queryKey: ['points', myUid] })
    },
  })
}

export function useRoomMedia(roomId: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'media', roomId],
    enabled: Boolean(roomId),
    queryFn: () => fetchRoomMediaPaths(roomId as string),
  })
}
