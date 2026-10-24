import { supabase } from '@/lib/supabase'

/**
 * Stories — paritas Android (`story_service.dart`).
 *
 * Tray & slides dibaca lewat RPC (server menegakkan visibility, blokir,
 * mute, dan `owner_only`), bukan query tabel langsung.
 * Tabel `stories` hanya dipakai untuk INSERT story sendiri dan DELETE.
 */

export interface StoryTrayItem {
  authorId: string
  authorName: string
  avatar: string
  thumbPath: string
  hasVideo: boolean
  hasUnseen: boolean
  hasOwnerOnly: boolean
  slideCount: number
  own: boolean
  muted: boolean
  isRegistered: boolean
  expiresAt: string | null
}

export interface StorySlide {
  id: string
  imagePath: string
  videoPath: string
  mediaType: string
  textOverlay: string
  textX: number
  textY: number
  textColor: number
  textSize: number
  textScale: number
  textRotation: number
  textBg: boolean
  visibility: string
  ownerOnly: boolean
  durationMs: number
  likeCount: number
  liked: boolean
  createdAt: string | null
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

export async function fetchStoryTray(): Promise<StoryTrayItem[]> {
  const { data, error } = await supabase.rpc('story_tray')
  if (error) throw error
  return (Array.isArray(data) ? data : []).map((raw) => {
    const row = asRecord(raw)
    return {
      authorId: asString(row.author_id),
      authorName: asString(row.author_name, 'Anon'),
      avatar: asString(row.avatar),
      thumbPath: asString(row.thumb_path),
      hasVideo: Boolean(row.has_video),
      hasUnseen: Boolean(row.has_unseen),
      hasOwnerOnly: Boolean(row.has_owner_only),
      slideCount: asNumber(row.slide_count),
      own: Boolean(row.own),
      muted: Boolean(row.muted),
      isRegistered: Boolean(row.is_registered),
      expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
    }
  })
}

export async function fetchStorySlides(authorId: string): Promise<StorySlide[]> {
  const { data, error } = await supabase.rpc('story_slides', { p_author: authorId })
  if (error) throw error
  // Paritas Android (`fetchSlides`): urutan TERLAMA → TERBARU, jadi cerita
  // diputar kronologis dan slide terakhir adalah yang paling baru.
  const rows = (Array.isArray(data) ? data : []).slice().sort((a, b) => {
    const left = asString(asRecord(a).created_at)
    const right = asString(asRecord(b).created_at)
    return left.localeCompare(right)
  })
  return rows.map((raw) => {
    const row = asRecord(raw)
    return {
      id: asString(row.id),
      imagePath: asString(row.image_path),
      videoPath: asString(row.video_path),
      mediaType: asString(row.media_type, 'image'),
      textOverlay: asString(row.text_overlay),
      textX: asNumber(row.text_x, 0.5),
      textY: asNumber(row.text_y, 0.85),
      textColor: asNumber(row.text_color),
      textSize: asNumber(row.text_size, 1),
      textScale: asNumber(row.text_scale, 1),
      textRotation: asNumber(row.text_rotation),
      textBg: Boolean(row.text_bg),
      visibility: asString(row.visibility, 'followers'),
      ownerOnly: Boolean(row.owner_only),
      durationMs: asNumber(row.duration_ms),
      likeCount: asNumber(row.like_count),
      liked: Boolean(row.liked),
      createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    }
  })
}

export type StoryVisibility = 'everyone' | 'followers' | 'friends'

/** Tandai story sudah ditonton (idempoten). */
export async function markStorySeen(storyId: string, viewerId: string): Promise<void> {
  const { error } = await supabase
    .from('story_views')
    .upsert(
      { story_id: storyId, viewer_id: viewerId },
      { onConflict: 'story_id,viewer_id', ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function toggleStoryLike(storyId: string): Promise<void> {
  const { error } = await supabase.rpc('toggle_story_like', { p_story_id: storyId })
  if (error) throw error
}

/**
 * Terbitkan story baru. `imagePath`/`videoPath` sudah diunggah ke storage
 * (`story/<uid>/...`). Maks 10 story / 24 jam ditegakkan policy server.
 */
export async function createStory(input: {
  authorId: string
  authorName: string
  imagePath: string
  videoPath?: string
  mediaType: 'image' | 'video'
  caption?: string
  visibility: StoryVisibility
  durationMs?: number
}): Promise<void> {
  const { error } = await supabase.from('stories').insert({
    author_id: input.authorId,
    author_name: input.authorName,
    image_path: input.imagePath,
    video_path: input.videoPath ?? '',
    media_type: input.mediaType,
    text_overlay: input.caption?.trim() ?? '',
    visibility: input.visibility,
    duration_ms: input.durationMs ?? 0,
  })
  if (error) throw error
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase.from('stories').delete().eq('id', storyId)
  if (error) throw error
}
