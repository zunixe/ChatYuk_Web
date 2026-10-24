import { useTranslation } from 'react-i18next'
import { SafeImage } from '@/components/ui/safe-image'
import { messageImageSrc } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

/**
 * Satu bubble ALBUM berisi beberapa foto (`album_id` sama) — paritas
 * `private_chat_chat2.dart` yang menggabungkan foto berurutan jadi grid.
 */
export function AlbumGrid({
  messages,
  isMine,
  onOpen,
}: {
  messages: Message[]
  isMine: boolean
  onOpen: (src: string) => void
}) {
  const { t } = useTranslation()
  const sources = messages
    .map((message) => ({ id: String(message.id), src: messageImageSrc(message) }))
    .filter((item): item is { id: string; src: string } => Boolean(item.src))

  if (sources.length === 0) {
    return <p className="px-2 py-1 text-[11.5px] text-muted">Media tidak tersedia</p>
  }

  const count = sources.length
  const gridClass =
    count === 2
      ? 'grid-cols-2'
      : count === 3
        ? 'grid-cols-3'
        : 'grid-cols-3'

  return (
    <div className="p-1">
      <div className={cn('grid gap-1', gridClass)}>
        {sources.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.src)}
            aria-label={t('groups.mediaOpen')}
            className={cn(
              'overflow-hidden rounded-lg bg-panel',
              count >= 4 && index === 0 ? 'col-span-2 row-span-2' : '',
            )}
          >
            <SafeImage
              src={item.src}
              alt=""
              loading="lazy"
              className={cn(
                'h-full w-full object-cover',
                count >= 4 && index === 0 ? 'aspect-square' : 'aspect-square',
              )}
            />
          </button>
        ))}
      </div>
      {isMine ? null : null}
    </div>
  )
}
