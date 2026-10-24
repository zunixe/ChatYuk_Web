import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Eye, Heart, Lock, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { SafeImage } from '@/components/ui/safe-image'
import { useStorySlides, useToggleStoryLike } from '@/hooks/useStories'
import { deleteStory, markStorySeen } from '@/lib/api/stories'
import { mediaUrl } from '@/lib/media'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

const TEXT_COLORS = [
  '#ffffff',
  '#111111',
  '#f44336',
  '#ec407a',
  '#9c27b0',
  '#2196f3',
  '#00bcd4',
  '#ffeb3b',
]

const IMAGE_DURATION_MS = 5000

/**
 * Penampil story layar penuh — paritas `story_viewer_screen.dart`.
 * Auto-advance untuk foto; video mengikuti durasi asli.
 */
export function StoryViewer({
  authorId,
  onClose,
  onNextAuthor,
}: {
  authorId: string
  onClose: () => void
  onNextAuthor: () => void
}) {
  const { t } = useTranslation()
  const myUid = useAuthStore((state) => state.profile?.id)
  const slides = useStorySlides(authorId)
  const like = useToggleStoryLike(authorId)
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<number | undefined>(undefined)
  const seenRef = useRef<Set<string>>(new Set())


  const items = useMemo(() => slides.data ?? [], [slides.data])
  const current = items[index]

  // Progress + auto-advance.
  useEffect(() => {
    if (!current) return
    const duration =
      current.mediaType === 'video' && current.durationMs > 0
        ? current.durationMs
        : IMAGE_DURATION_MS
    const startedAt = Date.now()
    if (timerRef.current) window.clearInterval(timerRef.current)
    // Nilai awal ditulis di tick pertama interval (bukan setState sinkron
    // di badan efek) supaya tidak memicu peringatan cascading render.
    timerRef.current = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / duration)
      setProgress(ratio)
      if (ratio >= 1) {
        if (timerRef.current) window.clearInterval(timerRef.current)
        if (index + 1 < items.length) setIndex(index + 1)
        else onNextAuthor()
      }
    }, 80)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [current, index, items.length, onNextAuthor])


  // Tandai sudah ditonton (sekali per slide).
  useEffect(() => {
    if (!current || !myUid) return
    if (seenRef.current.has(current.id)) return
    seenRef.current.add(current.id)
    void markStorySeen(current.id, myUid).catch(() => {})
  }, [current, myUid])

  if (slides.isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95">
        <Spinner />
      </div>
    )
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/95 text-white">
        <p className="text-[13px] text-white/80">{t('stories.empty')}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-[12.5px]"
        >
          {t('common.close')}
        </button>
      </div>
    )
  }

  const isMine = current.ownerOnly
  const imageSrc = current.mediaType === 'video' ? null : mediaUrl(current.imagePath)
  const videoSrc = current.mediaType === 'video' ? mediaUrl(current.videoPath) : null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {/* Progress bar per slide */}
      <div className="flex gap-1 px-3 pt-3">
        {items.map((slide, slideIndex) => (
          <span key={slide.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <span
              className="block h-full bg-white transition-[width] duration-100"
              style={{
                width:
                  slideIndex < index ? '100%' : slideIndex === index ? `${progress * 100}%` : '0%',
              }}
            />
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 text-white">
        <Avatar name="Story" size={28} />
        <span className="flex-1 truncate text-[12.5px]" />
        {isMine ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
            <Lock className="h-3 w-3" />
            {t('stories.ownerOnly')}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {imageSrc ? (
          <SafeImage
            src={imageSrc}
            alt=""
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : videoSrc ? (
          <video
            src={videoSrc}
            autoPlay
            playsInline
            className="max-h-full max-w-full"
            onEnded={() => {
              if (index + 1 < items.length) setIndex(index + 1)
              else onNextAuthor()
            }}
          />
        ) : (
          <p className="text-[12px] text-white/70">{t('media.privateNotice')}</p>
        )}

        {current.textOverlay ? (
          <p
            className={cn(
              'absolute max-w-[85%] break-words text-center',
              current.textBg && 'rounded-lg bg-black/45 px-2 py-1',
            )}
            style={{
              left: `${current.textX * 100}%`,
              top: `${current.textY * 100}%`,
              transform: `translate(-50%, -50%) rotate(${current.textRotation}deg) scale(${current.textScale})`,
              color: TEXT_COLORS[current.textColor] ?? '#fff',
              fontSize: `${16 * (current.textSize || 1)}px`,
              fontWeight: 600,
            }}
          >
            {current.textOverlay}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => (index > 0 ? setIndex(index - 1) : onNextAuthor())}
          aria-label="sebelumnya"
          className="absolute left-0 top-0 h-full w-1/4"
        />
        <button
          type="button"
          onClick={() => (index + 1 < items.length ? setIndex(index + 1) : onNextAuthor())}
          aria-label="berikutnya"
          className="absolute right-0 top-0 h-full w-1/4"
        />
        {index > 0 ? (
          <ChevronLeft className="pointer-events-none absolute left-1 h-5 w-5 text-white/60" />
        ) : null}
        {index + 1 < items.length ? (
          <ChevronRight className="pointer-events-none absolute right-1 h-5 w-5 text-white/60" />
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-2 px-4 pb-5 pt-2">
        {isMine ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!window.confirm(t('stories.deleteConfirm'))) return
              void deleteStory(current.id)
                .then(() => {
                  toast.success(t('stories.deleted'))
                  onClose()
                })
                .catch(() => toast.error(t('stories.publishFailed')))
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('common.delete')}
          </Button>
        ) : (
          <button
            type="button"
            onClick={() =>
              like.mutate(current.id, {
                onError: () => toast.error(t('stories.likeFailed')),
              })
            }
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition',
              current.liked ? 'bg-danger/20 text-danger' : 'bg-white/15 text-white',
            )}
          >
            <Heart className={cn('h-4 w-4', current.liked && 'fill-current')} />
            {current.likeCount}
          </button>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] text-white/70">
          <Eye className="h-3.5 w-3.5" />
          {index + 1}/{items.length}
        </span>
      </div>
    </div>
  )
}
