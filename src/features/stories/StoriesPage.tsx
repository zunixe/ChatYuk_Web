import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { SafeImage } from '@/components/ui/safe-image'
import { useStoryTray } from '@/hooks/useStories'
import { StoryViewer } from '@/features/stories/StoryViewer'
import { StoryComposer } from '@/features/stories/StoryComposer'
import { mediaUrl, resolveAvatar } from '@/lib/media'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

/**
 * Halaman Story — paritas tab Story di Android (`online_users/widgets/
 * story_tray.dart`): tray penonton (ring gradient bila belum dilihat) +
 * tombol buat story sendiri.
 */
export function StoriesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const tray = useStoryTray(Boolean(profile?.id))
  const [viewing, setViewing] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  const items = useMemo(() => tray.data ?? [], [tray.data])

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted transition hover:text-text"
          aria-label={t('groups.back')}
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="flex-1 font-display text-[15px] font-semibold text-text">
          {t('stories.title')}
        </h1>
        <Button size="sm" onClick={() => setComposing(true)}>
          <Plus className="h-3.5 w-3.5" />
          {t('stories.create')}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {tray.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center">
            <p className="text-[13px] font-medium text-text">{t('stories.empty')}</p>
            <p className="mt-1.5 text-[12px] text-muted">{t('stories.emptyHint')}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {items.map((item) => {
              const thumb = mediaUrl(item.thumbPath) ?? resolveAvatar(item.avatar)
              return (
                <li key={item.authorId}>
                  <button
                    type="button"
                    onClick={() => setViewing(item.authorId)}
                    className="group flex w-full flex-col items-center gap-1.5"
                    aria-label={item.authorName}
                  >
                    <span
                      className={cn(
                        'relative flex h-full w-full items-center justify-center rounded-2xl p-[2px]',
                        item.hasUnseen
                          ? 'bg-gradient-to-br from-primary via-accent to-primary'
                          : 'bg-border',
                      )}
                    >
                      <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[14px] bg-surface">
                        {thumb ? (
                          <SafeImage
                            src={thumb}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Avatar name={item.authorName} size={40} />
                        )}
                      </span>
                    </span>
                    <span className="w-full truncate text-center text-[11px] text-text">
                      {item.own ? t('stories.mine') : item.authorName}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {viewing ? (
        <StoryViewer
          authorId={viewing}
          onClose={() => setViewing(null)}
          onNextAuthor={() => {
            const index = items.findIndex((item) => item.authorId === viewing)
            const next = items[index + 1]
            setViewing(next ? next.authorId : null)
          }}
        />
      ) : null}

      <StoryComposer open={composing} onOpenChange={setComposing} />
    </div>
  )
}

