import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { useCreateRoom, useMyPoints, useRoomPricing } from '@/hooks/useGroups'
import { cn } from '@/lib/utils'

/** Sama dengan `kGroupIcons` di Android (`create_group_sheet.dart`). */
const GROUP_ICONS = [
  '💬',
  '👥',
  '🎉',
  '🎮',
  '🎵',
  '💘',
  '🔥',
  '⭐',
  '🌙',
  '👑',
  '☕',
  '🔒',
]

const NAME_MIN = 3
const NAME_MAX = 30
const PASS_MIN = 6
const PASS_MAX = 20

/**
 * Dialog buat grup. Biaya mengikuti `room_pricing()` dari server:
 * `create_paid × multiplier` (300) atau `create_pw_paid × multiplier` (450).
 * Server tetap sumber kebenaran — potongan dilakukan di RPC, bukan di klien.
 */
export function CreateGroupDialog({
  open,
  onOpenChange,
  myUid,
  defaultCountry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  myUid: string | undefined
  defaultCountry: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createRoom = useCreateRoom(myUid)
  const pricing = useRoomPricing()
  const points = useMyPoints(myUid)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(GROUP_ICONS[0])
  const [withPassword, setWithPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const balance = points.data ?? 0
  const multiplier = pricing.data?.multiplier || 1
  const base = withPassword ? (pricing.data?.createPwPaid ?? 0) : (pricing.data?.createPaid ?? 0)
  const cost = base * multiplier
  const notEnough = cost > 0 && balance < cost

  function reset() {
    setName('')
    setIcon(GROUP_ICONS[0])
    setWithPassword(false)
    setPassword('')
    setError(null)
  }

  function submit() {
    const clean = name.trim()
    if (clean.length < NAME_MIN || clean.length > NAME_MAX) {
      setError(t('groups.nameInvalid'))
      return
    }
    if (withPassword && (password.trim().length < PASS_MIN || password.trim().length > PASS_MAX)) {
      setError(t('groups.passwordInvalid'))
      return
    }
    setError(null)
    createRoom.mutate(
      {
        name: clean,
        icon,
        country: defaultCountry,
        password: withPassword ? password.trim() : undefined,
      },
      {
        onSuccess: (result) => {
          if (result.duplicate) toast.info(t('groups.createDuplicate'))
          else toast.success(t('groups.createSuccess'))
          if (result.joinToken) {
            toast.message(t('groups.joinToken', { token: result.joinToken }))
          }
          onOpenChange(false)
          reset()
          if (result.id) navigate(`/groups/${result.id}`)
        },
        onError: (mutationError) => {
          const message =
            mutationError instanceof Error ? mutationError.message : t('groups.createFailed')
          setError(message)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent title={t('groups.createTitle')} className="max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">{t('groups.name')}</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('groups.nameExample')}
            maxLength={NAME_MAX}
            disabled={createRoom.isPending}
          />
          <p className="text-[10.5px] text-muted-2">{t('groups.nameHint')}</p>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label>{t('groups.icon')}</Label>
          <div className="grid grid-cols-6 gap-1.5">
            {GROUP_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                aria-label={`icon ${emoji}`}
                aria-pressed={icon === emoji}
                className={cn(
                  'flex h-10 items-center justify-center rounded-xl border text-[18px] transition',
                  icon === emoji
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-panel hover:border-primary/40',
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border bg-panel px-3 py-2.5">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={withPassword}
              onChange={(event) => setWithPassword(event.target.checked)}
              disabled={createRoom.isPending}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <KeyRound className="h-3.5 w-3.5 text-muted" />
            <span className="text-[12.5px] text-text">{t('groups.usePassword')}</span>
          </label>
          {withPassword ? (
            <div className="mt-2 space-y-1">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('groups.passwordRule')}
                maxLength={PASS_MAX}
                disabled={createRoom.isPending}
              />
              <p className="text-[10.5px] text-muted-2">{t('groups.passwordRule')}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2 text-[11.5px] text-primary">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {cost > 0
              ? t('groups.cost', { cost, points: balance })
              : t('groups.costFree')}
          </span>
        </div>

        {notEnough ? (
          <p className="mt-2 text-[11.5px] text-danger">
            {t('groups.notEnoughPoints', { cost, points: balance })}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-[11.5px] text-danger">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={createRoom.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={createRoom.isPending || notEnough}>
            {createRoom.isPending ? <Spinner /> : null}
            {t('groups.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
