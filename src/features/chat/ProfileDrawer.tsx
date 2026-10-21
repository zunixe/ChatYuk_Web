import { Cake, CalendarDays, MapPin, ShieldCheck, ShieldOff, ShieldX, UserRound, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SideSheet } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/feedback'
import { useAvatars, useOtherProfile } from '@/hooks/useChatData'
import { useBlockedSet, useSetBlocked } from '@/hooks/useBlocks'
import { resolveAvatar } from '@/lib/media'
import { effectiveStatus } from '@/lib/presence'
import { formatLastSeen } from '@/lib/time'
import { genderLabel, statusLabel } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

interface ProfileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uid: string | undefined
  fallbackName: string
}

export function ProfileDrawer({ open, onOpenChange, uid, fallbackName }: ProfileDrawerProps) {
  const profileQuery = useOtherProfile(uid)
  const avatarQuery = useAvatars(uid ? [uid] : [])
  const profile = profileQuery.data
  const avatar = resolveAvatar(profile?.avatar || avatarQuery.data?.[uid ?? ''])
  const name = profile?.nickname || fallbackName
  const status = effectiveStatus(profile?.status, profile?.last_seen)
  const myUid = useAuthStore((state) => state.profile?.id)
  const blockedSet = useBlockedSet(myUid)
  const setBlocked = useSetBlocked(myUid)
  const blocked = Boolean(uid && blockedSet.has(uid))

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title="Info kontak">
      <div className="flex flex-col">
        <div className="relative flex flex-col items-center overflow-hidden bg-gradient-to-b from-primary/15 via-primary/5 to-transparent px-6 pb-6 pt-8">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-panel md:hidden"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
          <Avatar src={avatar} name={name} size={104} online={status === 'online'} />
          <h2 className="mt-3 max-w-full truncate font-display text-[19px] font-semibold text-text">
            {name}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {status === 'online'
              ? 'online'
              : status === 'idle'
                ? 'sedang tidak aktif'
                : profile?.last_seen
                  ? formatLastSeen(profile.last_seen)
                  : statusLabel(status)}
          </p>
        </div>

        {profileQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-primary" />
          </div>
        ) : profileQuery.isError ? (
          <div className="px-6 py-8 text-center text-[12px] text-muted">
            Info kontak tidak dapat dimuat saat ini.
          </div>
        ) : (
          <div className="px-5 pb-8">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-2">
                Tentang
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text">
                {profile?.about?.trim() || 'Belum ada deskripsi.'}
              </p>
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
              <InfoRow icon={<UserRound className="h-3.5 w-3.5" />} label="Jenis kelamin" value={genderLabel(profile?.gender)} />
              <InfoRow icon={<Cake className="h-3.5 w-3.5" />} label="Umur" value={profile?.age ? `${profile.age} tahun` : 'Tidak dibagikan'} />
              <InfoRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Lokasi"
                value={[profile?.city, profile?.country].filter(Boolean).join(', ') || 'Tidak dibagikan'}
              />
              <InfoRow
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Bergabung"
                value={
                  profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Tidak tersedia'
                }
              />
            </div>

            {uid ? (
              <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                    {blocked ? <ShieldX className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-text">
                      {blocked ? 'Kamu memblokir kontak ini' : 'Blokir kontak'}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      {blocked
                        ? 'Kamu tidak bisa mengirim pesan sampai blokir dibuka.'
                        : 'Cegah kontak ini mengirim pesan lewat web maupun aplikasi.'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={blocked ? 'secondary' : 'danger'}
                  size="sm"
                  className="mt-3 w-full"
                  disabled={setBlocked.isPending}
                  onClick={() => {
                    if (!uid) return
                    if (!blocked && !window.confirm(`Blokir ${name}?`)) return
                    setBlocked.mutate(
                      { otherUid: uid, blocked: !blocked },
                      {
                        onSuccess: () =>
                          toast.success(blocked ? 'Blokir dibuka.' : 'Kontak diblokir.'),
                        onError: () => toast.error('Gagal memperbarui blokir.'),
                      },
                    )
                  }}
                >
                  {blocked ? 'Buka blokir' : 'Blokir kontak'}
                </Button>
              </div>
            ) : null}

            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-panel px-3.5 py-3 text-[10.5px] leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Sebagian informasi mungkin disembunyikan sesuai pengaturan privasi kontak ini.
            </div>
          </div>
        )}
      </div>
    </SideSheet>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel text-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-2">{label}</div>
        <div className="mt-0.5 text-[12.5px] text-text">{value}</div>
      </div>
    </div>
  )
}
