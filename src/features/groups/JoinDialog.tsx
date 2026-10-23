import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import type { Room } from '@/lib/api/groups'

/**
 * Dialog gabung grup. Biaya poin mengikuti `room_pricing()` dari server
 * (bukan hardcode) — paritas Android.
 */
export function JoinDialog({
  room,
  pending,
  onOpenChange,
  onConfirm,
}: {
  room: Room | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (password?: string) => void
}) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')

  // Catatan: server (`join_private_room`) TIDAK menagih poin untuk bergabung —
  // jalur auto-join bersifat gratis ("bukan mode koin"). `room_pricing()` masih
  // memuat `join_paid`, jadi JANGAN menampilkan biaya yang tidak benar-benar
  // ditagih. Bila server kelak menagih lagi, `charged` dari respons akan > 0
  // dan dialog bisa dihidupkan kembali.

  return (
    <Dialog
      open={Boolean(room)}
      onOpenChange={(open) => {
        if (!open) setPassword('')
        onOpenChange(open)
      }}
    >
      <DialogContent title={t('groups.joinTitle')} className="max-w-md">
        <div className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-[17px]">
            {room?.icon || '💬'}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-text">{room?.name}</div>
            <div className="text-[11px] text-muted">{room?.country}</div>
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-muted">{t('groups.joinFree')}</p>

        {room?.approvalRequired ? (
          <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-[11.5px] text-warning">
            {t('groups.approvalNote')}
          </p>
        ) : null}

        {room?.hasPassword ? (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="group-password">{t('groups.password')}</Label>
            <Input
              id="group-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('groups.passwordHint')}
              disabled={pending}
            />
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => onConfirm(password)}
            disabled={pending || (room?.hasPassword === true && !password.trim())}
          >
            {pending ? <Spinner /> : null}
            {t('groups.join')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
