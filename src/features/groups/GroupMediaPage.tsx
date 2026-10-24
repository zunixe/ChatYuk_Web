import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Images } from 'lucide-react'
import { Spinner } from '@/components/ui/feedback'
import { SafeImage } from '@/components/ui/safe-image'
import { useRoom, useRoomMedia } from '@/hooks/useGroups'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/lib/media'

/**
 * Galeri media grup — paritas `group_media_screen.dart`.
 * Mengambil `messages.image_path` unik (terbaru dulu, maks 200).
 */
export function GroupMediaPage() {
  const { t } = useTranslation()
  const { groupId } = useParams<{ groupId: string }>()
  const myUid = useAuthStore((state) => state.profile?.id)
  const room = useRoom(groupId, myUid)
  const media = useRoomMedia(groupId)
  const [preview, setPreview] = useState<string | null>(null)

  const paths = media.data ?? []

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <Link to={groupId ? `/groups/${groupId}` : '/groups'} className="text-muted hover:text-text">
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel text-primary">
          <Images className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-text">{t('groups.media')}</div>
          <div className="truncate text-[11px] text-muted">{room.data?.name ?? '—'}</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4">
        {media.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : paths.length === 0 ? (
          <p className="py-10 text-center text-[12.5px] text-muted">{t('groups.mediaEmpty')}</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
            {paths.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => setPreview(mediaUrl(path))}
                className="aspect-square overflow-hidden rounded-xl bg-panel"
                aria-label={t('groups.mediaOpen')}
              >
                <SafeImage
                  src={mediaUrl(path) ?? ''}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {preview ? (
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          aria-label={t('common.cancel')}
        >
          <SafeImage src={preview} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}
    </div>
  )
}
