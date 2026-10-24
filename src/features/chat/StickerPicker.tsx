import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sticker } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SafeImage } from '@/components/ui/safe-image'
import { Spinner } from '@/components/ui/feedback'
import { listMyStickers, mediaUrl } from '@/lib/media'

/**
 * Pemilih stiker — paritas `sticker_sheet.dart` (sub-tab "Koleksiku").
 *
 * Stiker milik user disimpan di `stickers/<uid>/` dan dikirim sebagai
 * pesan `type='sticker'` dengan `image_data = path` (kontrak Android
 * `stickerDispatch`). Emoji Art (Twemoji) belum termasuk.
 */
export function StickerPicker({
  myUid,
  onPick,
  disabled,
}: {
  myUid: string | undefined
  onPick: (path: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [paths, setPaths] = useState<string[] | null>(null)

  useEffect(() => {
    if (!open || !myUid) return
    let cancelled = false
    void listMyStickers(myUid).then((items) => {
      if (!cancelled) setPaths(items)
    })
    return () => {
      cancelled = true
    }
  }, [open, myUid])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t('chat.sticker')}
          title={t('chat.sticker')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text disabled:opacity-50"
        >
          <Sticker className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        {paths === null ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : paths.length === 0 ? (
          <p className="px-1 py-4 text-center text-[11.5px] text-muted">
            {t('chat.noSticker')}
          </p>
        ) : (
          <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
            {paths.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => {
                  onPick(path)
                  setOpen(false)
                }}
                className="aspect-square overflow-hidden rounded-lg transition hover:bg-panel"
                aria-label="sticker"
              >
                <SafeImage
                  src={mediaUrl(path) ?? ''}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
