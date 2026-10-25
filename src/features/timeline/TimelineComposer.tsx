import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Label, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { useCreatePost } from '@/hooks/useTimeline'
import { uploadChatImage } from '@/lib/media'
import { MAX_IMAGE_BYTES } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

const MAX_IMAGES = 4

/**
 * Komposer timeline — paritas `post_composer_screen.dart` versi web:
 * teks + maks 4 foto, visibilitas. Gambar diunggah ke `posts/<uid>/...`
 * (policy storage mensyaratkan segmen ke-2 = uid untuk prefix `posts`).
 */
export function TimelineComposer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const profile = useAuthStore((state) => state.profile)
  const create = useCreatePost()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'friends'>('public')

  const [wasOpen, setWasOpen] = useState(open)
  // Reset saat dialog DITUTUP (pola render-time, bukan efek).
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) {
      setText('')
      setFiles([])
      setVisibility('public')
    }
  }

  async function publish() {
    if (!profile?.id) return
    if (!text.trim() && files.length === 0) {
      toast.error(t('timeline.compose'))
      return
    }
    const tooBig = files.find((file) => file.size > MAX_IMAGE_BYTES)
    if (tooBig) {
      toast.error('Ukuran gambar maksimal 8 MB.')
      return
    }
    try {
      const storageKey = `posts/${profile.id}`
      const paths: string[] = []
      for (const file of files) {
        paths.push(await uploadChatImage(storageKey, file))
      }
      await create.mutateAsync({
        text,
        imagePaths: paths,
        imageDims: [],
        visibility,
      })
      toast.success(t('timeline.published'))
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error) || t('timeline.publishFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('timeline.title')} className="max-w-lg">
        <Textarea
          rows={4}
          maxLength={1000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('timeline.compose')}
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex items-center gap-1 rounded-lg bg-panel px-2 py-1 text-[11px] text-text"
            >
              {file.name.slice(0, 18)}
              <button
                type="button"
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                aria-label={t('common.delete')}
              >
                <X className="h-3 w-3 text-muted" />
              </button>
            </span>
          ))}
        </div>

        <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-panel px-2.5 py-1.5 text-[11.5px] text-muted transition hover:border-primary/40">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES)
              event.target.value = ''
              setFiles(picked)
            }}
          />
          <ImagePlus className="h-3.5 w-3.5" />
          {t('timeline.photo')} ({files.length}/{MAX_IMAGES})
        </label>

        <div className="mt-3">
          <Label>{t('timeline.visibility')}</Label>
          <div className="mt-1 flex gap-1.5">
            {(
              [
                ['public', t('timeline.visPublic')],
                ['followers', t('timeline.visFollowers')],
                ['friends', t('timeline.visFriends')],
              ] as Array<['public' | 'followers' | 'friends', string]>
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
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void publish()} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : null}
            {t('timeline.publish')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
