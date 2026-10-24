import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchStorySlides,
  fetchStoryTray,
  toggleStoryLike,
  type StorySlide,
} from '@/lib/api/stories'

export function useStoryTray(enabled = true) {
  return useQuery({
    queryKey: ['stories', 'tray'],
    enabled,
    staleTime: 30_000,
    queryFn: fetchStoryTray,
  })
}

export function useStorySlides(authorId: string | undefined) {
  return useQuery({
    queryKey: ['stories', 'slides', authorId],
    enabled: Boolean(authorId),
    queryFn: () => fetchStorySlides(authorId as string),
  })
}

export function useToggleStoryLike(authorId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyId: string) => toggleStoryLike(storyId),
    onMutate: async (storyId) => {
      // Optimistis: balik `liked` & geser `like_count` seketika.
      const key = ['stories', 'slides', authorId]
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<StorySlide[]>(key)
      if (previous) {
        queryClient.setQueryData<StorySlide[]>(
          key,
          previous.map((slide) =>
            slide.id === storyId
              ? {
                  ...slide,
                  liked: !slide.liked,
                  likeCount: slide.likeCount + (slide.liked ? -1 : 1),
                }
              : slide,
          ),
        )
      }
      return { previous, key }
    },
    onError: (_error, _storyId, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['stories', 'slides', authorId] })
    },
  })
}
