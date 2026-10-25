import { useTranslation } from 'react-i18next'
import { Heart, MessageCircle, Send, Share2, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { SafeImage } from '@/components/ui/safe-image'
import { mediaUrl } from '@/lib/media'
import type { Post } from '@/lib/api/timeline'
import { cn } from '@/lib/utils'

function timeAgo(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return locale === 'id' ? 'baru saja' : 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}j`
  const days = Math.floor(hours / 24)
  return `${days}h`
}

/** Satu kartu post timeline (paritas feed Threads ala Android). */
export function PostCard({
  post,
  myUid,
  isIndonesian,
  onLike,
  onComment,
  onShare,
  onDelete,
}: {
  post: Post
  myUid: string | undefined
  isIndonesian: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const isMine = post.authorId === myUid
  const images = post.images.map((path) => mediaUrl(path)).filter(Boolean) as string[]

  return (
    <article className="rounded-2xl border border-border bg-surface p-3">
      <header className="flex items-center gap-2.5">
        <Avatar name={post.authorName} size={34} gender={post.authorGender} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-text">{post.authorName}</div>
          <div className="text-[10.5px] text-muted-2">
            {timeAgo(post.createdAt, isIndonesian ? 'id' : 'en')}
            {post.isBoosted ? ' · ⚡' : ''}
            {post.country ? ` · ${post.country}` : ''}
          </div>
        </div>
        {isMine ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('common.delete')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-2 transition hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </header>

      {post.text ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text">
          {post.text}
        </p>
      ) : null}

      {images.length > 0 ? (
        <div
          className={cn(
            'mt-2 grid gap-1 overflow-hidden rounded-xl',
            images.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
          )}
        >
          {images.map((src) => (
            <SafeImage
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="max-h-80 w-full object-cover"
            />
          ))}
        </div>
      ) : null}

      <footer className="mt-2.5 flex items-center gap-1 border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={onLike}
          aria-pressed={post.isLiked}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] transition hover:bg-panel',
            post.isLiked ? 'text-danger' : 'text-muted',
          )}
        >
          <Heart className={cn('h-3.5 w-3.5', post.isLiked && 'fill-current')} />
          {post.likeCount}
        </button>
        <button
          type="button"
          onClick={onComment}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-muted transition hover:bg-panel"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {post.commentCount}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-muted transition hover:bg-panel"
        >
          <Share2 className="h-3.5 w-3.5" />
          {post.shareCount}
        </button>
        <Send className="ml-auto hidden h-3.5 w-3.5 text-muted-2" />
      </footer>
    </article>
  )
}
