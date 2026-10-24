import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Label, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { useQueryClient } from '@tanstack/react-query'
import { createStory, type StoryVisibility } from '@/lib/api/stories'
import { uploadChatImage, uploadChatVideo } from '@/lib/media'
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

/**
 * Komposer story dari web — paritas `story_composer_screen.dart` (versi
 * sederhana): pilih 1 foto/video, caption, dan visibilitas.
 *
 * Aset diunggah ke `story/<uid>/...` (policy `storage_object_owner_ok`
 * mensyaratkan segmen ke-2 = uid untuk prefix `story`).
 */
export function StoryComposer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const profile = useAuthStore((state) => state.profile)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState<StoryVisibility>('everyone')
  const [busy, setBusy] = useState(false)

  function reset() {
    setFile(null)
    setCaption('')
    setVisibility('everyone')
  }

  async function publish() {
    if (!file || !profile?.id) return
    const isVideo = file.type.startsWith('video/')
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      toast.error('Ukuran video maksimal 15 MB.')
      return
    }
    if (!isVideo && file.size > MAX_IMAGE_BYTES) {
      toast.error('Ukuran gambar maksimal 8 MB.')
      return
    }
    setBusy(true)
    try {
      const storageKey = `story/${profile.id}`
      let imagePath = ''
      let videoPath = ''
      if (isVideo) {
        videoPath = await uploadChatVideo(storageKey, file)
      } else {
        imagePath = await uploadChatImage(storageKey, file)
      }
      await createStory({
        authorId: profile.id,
        authorName: profile.nickname ?? 'Anon',
        imagePath: imagePath || videoPath,
        videoPath: isVideo ? videoPath : '',
        mediaType: isVideo ? 'video' : 'image',
        caption,
        visibility,
      })
      toast.success(t('stories.published'))
      void queryClient.invalidateQueries({ queryKey: ['stories'] })
      onOpenChange(false)
      reset()
    } catch (error) {
      toast.error(errorMessage(error) || t('stories.publishFailed'))
    } finally {
      setBusy(false)
    }
  }

  const isVideo = Boolean(file?.type.startsWith('video/'))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent title={t('stories.create')} className="max-w-md">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-panel px-4 py-8 text-center transition hover:border-primary/50">
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null
              event.target.value = ''
              setFile(picked)
            }}
          />
          {file ? (
            <>
              <span className="text-[12.5px] font-medium text-text">{file.name}</span>
              <span className="text-[10.5px] text-muted-2">
                {(file.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                {isVideo ? t('chat.video') : t('chat.photo')}
              </span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-primary" />
              <span className="text-[12.5px] text-muted">{t('stories.pickMedia')}</span>
            </>
          )}
        </label>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="story-caption">{t('stories.caption')}</Label>
          <Textarea
            id="story-caption"
            rows={2}
            maxLength={120}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder={t('stories.caption')}
          />
        </div>

        <div className="mt-3 space-y-1.5">
          <Label>{t('stories.visibility')}</Label>
          <div className="flex gap-1.5">
            {(
              [
                ['everyone', t('stories.visEveryone')],
                ['followers', t('stories.visFollowers')],
                ['friends', t('stories.visFriends')],
              ] as Array<[StoryVisibility, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                aria-pressed={visibility === value}
                className={cn(
                  'flex-1 rounded-xl border px-2 py-1.5 text-[11.5px] transition',
                  visibility === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-panel text-muted hover:border-primary/40',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void publish()} disabled={busy || !file}>
            {busy ? <Spinner /> : null}
            {t('stories.publish')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
