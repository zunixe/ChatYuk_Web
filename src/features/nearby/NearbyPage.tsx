import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { useNearbyUsers, useShareMyLocation, useStopSharingLocation } from '@/hooks/useNearby'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const RADIUS_OPTIONS = [5, 10, 25, 50]

/**
 * Halaman "Sekitar" — paritas `nearby_screen.dart`, dengan pagar privasi:
 *
 * 1. Tidak ada pembacaan apa pun sebelum pengguna menekan **Setuju**
 *    (lokasi tidak dikirim otomatis saat halaman dibuka).
 * 2. Server hanya mengembalikan **jarak**, bukan koordinat orang lain.
 * 3. Bisa dimatikan kapan saja lewat tombol "Berhenti berbagi".
 */
export function NearbyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const [radius, setRadius] = useState(10)
  const [consented, setConsented] = useState(false)

  const share = useShareMyLocation(profile?.id)
  const stop = useStopSharingLocation(profile?.id)
  const nearby = useNearbyUsers(radius, consented)

  const rows = nearby.data ?? []

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
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <MapPin className="h-4.5 w-4.5" />
        </span>
        <h1 className="flex-1 font-display text-[15px] font-semibold text-text">
          {t('nearby.title')}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!consented ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-5 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="mt-3 font-display text-[15px] font-semibold text-text">
              {t('nearby.consentTitle')}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              {t('nearby.consentBody')}
            </p>
            <Button
              className="mt-4 w-full"
              disabled={share.isPending}
              onClick={() =>
                share.mutate(undefined, {
                  onSuccess: () => {
                    setConsented(true)
                    toast.success(t('nearby.sharing'))
                  },
                  onError: (error) => toast.error(errorMessage(error) || t('nearby.failed')),
                })
              }
            >
              {share.isPending ? <Spinner /> : <MapPin className="h-4 w-4" />}
              {t('nearby.agree')}
            </Button>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-1.5">
              {RADIUS_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRadius(value)}
                  aria-pressed={radius === value}
                  className={cn(
                    'flex-1 rounded-xl border px-2 py-1.5 text-[11.5px] transition',
                    radius === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-panel text-muted hover:border-primary/40',
                  )}
                >
                  {t('nearby.km', { n: value })}
                </button>
              ))}
            </div>

            <div className="mt-2.5">
              {nearby.isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
                  <p className="text-[12.5px] font-medium text-text">{t('nearby.empty')}</p>
                  <p className="mt-1 text-[11.5px] text-muted">{t('nearby.emptyHint')}</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {rows.map((user) => (
                    <li
                      key={user.uid}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2"
                    >
                      <Avatar
                        name={user.nickname}
                        size={32}
                        gender={user.gender}
                        online={user.status === 'online'}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] text-text">{user.nickname}</div>
                        <div className="truncate text-[10.5px] text-muted-2">
                          {[user.city, user.country].filter(Boolean).join(', ') || '—'}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-panel px-2 py-0.5 text-[10.5px] text-muted">
                        {t('nearby.distance', { n: user.distanceKm.toFixed(1) })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button
              variant="secondary"
              className="mt-3 w-full"
              disabled={stop.isPending}
              onClick={() =>
                stop.mutate(undefined, {
                  onSuccess: () => {
                    setConsented(false)
                    toast.success(t('nearby.stopped'))
                  },
                  onError: (error) => toast.error(errorMessage(error)),
                })
              }
            >
              {t('nearby.stop')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
