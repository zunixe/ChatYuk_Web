import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listStarredIds, toggleStar, type StarChatType } from '@/lib/api/stars'

export function useStarredIds(
  userId: string | undefined,
  chatType: StarChatType,
  chatId: string | undefined,
) {
  return useQuery({
    queryKey: ['stars', chatType, chatId, userId],
    enabled: Boolean(userId && chatId),
    queryFn: () => listStarredIds(userId as string, chatType, chatId as string),
  })
}

export function useToggleStar(
  userId: string | undefined,
  chatType: StarChatType,
  chatId: string | undefined,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string | number) =>
      toggleStar({
        userId: userId as string,
        chatType,
        chatId: chatId as string,
        messageId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stars', chatType, chatId, userId] })
    },
  })
}
