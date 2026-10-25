import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPostComment,
  createPost,
  deleteComment,
  deletePost,
  fetchPostComments,
  fetchPosts,
  sharePost,
  togglePostLike,
  type Post,
  type TimelineScope,
} from '@/lib/api/timeline'

export function usePosts(scope: TimelineScope, enabled = true) {
  return useQuery({
    queryKey: ['timeline', scope],
    enabled,
    staleTime: 20_000,
    queryFn: () => fetchPosts({ scope }),
  })
}

export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['timeline', 'comments', postId],
    enabled: Boolean(postId),
    queryFn: () => fetchPostComments(postId as string),
  })
}

function useTimelineInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['timeline'] })
  }
}

export function useTogglePostLike() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => togglePostLike(postId),
    onMutate: async (postId) => {
      // Optimistis pada semua cache scope.
      const entries = queryClient.getQueriesData<Post[]>({ queryKey: ['timeline'] })
      for (const [key, list] of entries) {
        if (!Array.isArray(list) || key.includes('comments')) continue
        queryClient.setQueryData<Post[]>(
          key,
          list.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  isLiked: !post.isLiked,
                  likeCount: post.likeCount + (post.isLiked ? -1 : 1),
                }
              : post,
          ),
        )
      }
      return { entries }
    },
    onError: (_error, _postId, context) => {
      for (const [key, list] of context?.entries ?? []) {
        queryClient.setQueryData(key, list)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export function useCreatePost() {
  const invalidate = useTimelineInvalidate()
  return useMutation({
    mutationFn: (input: Parameters<typeof createPost>[0]) => createPost(input),
    onSuccess: invalidate,
  })
}

export function useAddComment(postId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => addPostComment(postId as string, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timeline', 'comments', postId] })
      void queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export function useSharePost() {
  const invalidate = useTimelineInvalidate()
  return useMutation({
    mutationFn: (postId: string) => sharePost(postId),
    onSuccess: invalidate,
  })
}

export function useDeletePost() {
  const invalidate = useTimelineInvalidate()
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: invalidate,
  })
}

export function useDeleteComment(postId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timeline', 'comments', postId] })
      void queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}
