import { supabase } from '@/lib/supabase'

/**
 * Timeline / posts — paritas Android `timeline_service.dart`.
 *
 * Semua baca/tulis lewat RPC (server menegakkan visibility, blokir, follow,
 * dan hitungan like/comment/share). Tabel `posts` hanya untuk hapus milik
 * sendiri (RLS `posts_delete_own`).
 */

export type TimelineScope = 'all' | 'following' | 'mine'

export interface Post {
  id: string
  authorId: string
  authorName: string
  authorGender: string
  authorAvatar: string
  text: string
  images: string[]
  imageDims: Array<{ w: number; h: number }>
  visibility: string
  country: string
  likeCount: number
  commentCount: number
  shareCount: number
  isLiked: boolean
  isBoosted: boolean
  isFollowing: boolean
  isFriend: boolean
  createdAt: string
}

export interface PostComment {
  id: number
  authorId: string
  authorName: string
  authorGender: string
  authorAvatar: string
  text: string
  parentId: number | null
  likeCount: number
  shareCount: number
  isLiked: boolean
  createdAt: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function mapPost(raw: unknown): Post {
  const row = asRecord(raw)
  const dims = Array.isArray(row.imageDims)
    ? row.imageDims.map((item) => {
        const dim = asRecord(item)
        return { w: asNumber(dim.w), h: asNumber(dim.h) }
      })
    : []
  return {
    id: asString(row.id),
    authorId: asString(row.authorId),
    authorName: asString(row.authorName, 'Anon'),
    authorGender: asString(row.authorGender),
    authorAvatar: asString(row.authorAvatar),
    text: asString(row.text),
    images: Array.isArray(row.images) ? row.images.map((item) => String(item)) : [],
    imageDims: dims,
    visibility: asString(row.visibility, 'public'),
    country: asString(row.country),
    likeCount: asNumber(row.likeCount),
    commentCount: asNumber(row.commentCount),
    shareCount: asNumber(row.shareCount),
    isLiked: Boolean(row.isLiked),
    isBoosted: Boolean(row.isBoosted),
    isFollowing: Boolean(row.isFollowing),
    isFriend: Boolean(row.isFriend),
    createdAt: asString(row.createdAt),
  }
}

function mapComment(raw: unknown): PostComment {
  const row = asRecord(raw)
  return {
    id: asNumber(row.id),
    authorId: asString(row.authorId),
    authorName: asString(row.authorName, 'Anon'),
    authorGender: asString(row.authorGender),
    authorAvatar: asString(row.authorAvatar),
    text: asString(row.text),
    parentId: typeof row.parentId === 'number' ? row.parentId : null,
    likeCount: asNumber(row.likeCount),
    shareCount: asNumber(row.shareCount),
    isLiked: Boolean(row.isLiked),
    createdAt: asString(row.createdAt),
  }
}

export async function fetchPosts(input: {
  scope: TimelineScope
  limit?: number
  cursor?: string | null
  cursorBoosted?: boolean
  country?: string | null
}): Promise<Post[]> {
  const { data, error } = await supabase.rpc('list_posts', {
    p_scope: input.scope,
    p_limit: input.limit ?? 30,
    p_cursor: input.cursor ?? null,
    p_cursor_boosted: input.cursorBoosted ?? false,
    p_country: input.country ?? null,
  })
  if (error) throw error
  const posts = asRecord(data).posts
  return (Array.isArray(posts) ? posts : []).map(mapPost)
}

/** Buat post. `imagePaths` WAJIB path storage `posts/<uid>/...`. */
export async function createPost(input: {
  text: string
  imagePaths?: string[]
  imageDims?: Array<{ w: number; h: number }>
  visibility?: 'public' | 'followers' | 'friends'
}): Promise<void> {
  const text = input.text.trim()
  const paths = input.imagePaths ?? []
  if (!text && paths.length === 0) throw new Error('Tulisan atau foto wajib diisi.')
  for (const path of paths) {
    if (!path.startsWith('posts/')) throw new Error('Path gambar harus posts/...')
  }
  const { error } = await supabase.rpc('create_post', {
    p_text: text,
    p_image_paths: paths,
    p_visibility: input.visibility ?? 'public',
    p_image_dims: (input.imageDims ?? []) as unknown,
    p_image_blurhashes: [],
  })
  if (error) throw error
}

export async function togglePostLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId })
  if (error) throw error
  const row = asRecord(data)
  return { liked: Boolean(row.liked), likeCount: asNumber(row.likeCount) }
}

export async function fetchPostComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase.rpc('list_post_comments', { p_post_id: postId })
  if (error) throw error
  return (Array.isArray(data) ? data : []).map(mapComment)
}

export async function addPostComment(postId: string, text: string): Promise<void> {
  const clean = text.trim()
  if (!clean) throw new Error('Komentar kosong.')
  const { error } = await supabase.rpc('add_post_comment', { p_post_id: postId, p_text: clean })
  if (error) throw error
}

export async function replyPostComment(
  postId: string,
  parentId: number,
  text: string,
): Promise<void> {
  const clean = text.trim()
  if (!clean) throw new Error('Komentar kosong.')
  const { error } = await supabase.rpc('reply_post_comment', {
    p_post_id: postId,
    p_parent_id: parentId,
    p_text: clean,
  })
  if (error) throw error
}

export async function sharePost(postId: string): Promise<void> {
  const { error } = await supabase.rpc('share_post', { p_post_id: postId })
  if (error) throw error
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw error
}

export async function deleteComment(commentId: number): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  if (error) throw error
}
