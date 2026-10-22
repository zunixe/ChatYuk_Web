import { Flag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { reportUser } from '@/lib/api/reports'

/**
 * Dialog "Laporkan pengguna" — sama seperti Android (`user_info_build.dart`):
 * alasan wajib diisi, lalu laporan masuk ke tabel `reports` untuk ditinjau admin.
 */
export function ReportUserDialog({
  open,
  onOpenChange,
  reporterId,
  reportedId,
  reportedName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reporterId: string | undefined
  reportedId: string | undefined
  reportedName: string
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!reporterId || !reportedId) return
    if (!reason.trim()) {
      setError(t('contact.reportNeedReason'))
      return
    }
    setSending(true)
    setError(null)
    try {
      await reportUser(reporterId, reportedId, reason)
      setReason('')
      onOpenChange(false)
      toast.success(t('contact.reportSuccess'))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gagal mengirim laporan.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('')
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent title={t('contact.reportTitle')} className="max-w-md">
        <p className="text-[12.5px] leading-relaxed text-muted">
          {t('contact.reportHint')} — {reportedName}
        </p>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t('contact.reportHint')}
          rows={4}
          maxLength={500}
          disabled={sending}
          className="mt-3"
          aria-label={t('contact.reportHint')}
        />
        {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={sending}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={() => void submit()} disabled={sending}>
            {sending ? <Spinner /> : <Flag className="h-4 w-4" />}
            {sending ? t('common.saving') : t('contact.reportSubmit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
