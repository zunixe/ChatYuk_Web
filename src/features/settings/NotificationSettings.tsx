import { useState } from 'react'
import { Bell, BellOff, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  notificationPermission,
  notificationsEnabled,
  notificationsSupported,
  requestNotificationPermission,
  setNotificationsEnabled,
  showLocalNotification,
  type NotifPermission,
} from '@/lib/notifications'
import { cn } from '@/lib/utils'

const LABEL: Record<NotifPermission, string> = {
  granted: 'Diizinkan browser',
  denied: 'Diblokir browser',
  default: 'Belum diizinkan',
  unsupported: 'Tidak didukung browser ini',
}

/**
 * Pengaturan notifikasi browser (B11).
 *
 * Catatan penting yang ditampilkan ke pengguna: notifikasi hanya muncul
 * selama tab ChatYuk terbuka (walau disembunyikan). Push latar belakang
 * belum aktif karena butuh VAPID keypair di server.
 */
export function NotificationSettings() {
  // Nilai awal dibaca langsung dari browser (bukan lewat efek) agar tidak
  // memicu cascading render.
  const [permission, setPermission] = useState<NotifPermission>(() => notificationPermission())
  const [enabled, setEnabled] = useState<boolean>(() => notificationsEnabled())
  const [busy, setBusy] = useState(false)

  async function enable() {
    setBusy(true)
    try {
      const result = await requestNotificationPermission()
      setPermission(result)
      if (result === 'granted') {
        setNotificationsEnabled(true)
        setEnabled(true)
        showLocalNotification({
          title: 'ChatYuk',
          body: 'Notifikasi browser aktif.',
          tag: 'chatyuk-test',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  function disable() {
    setNotificationsEnabled(false)
    setEnabled(false)
  }

  const supported = notificationsSupported()

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel text-muted">
          {enabled ? <Bell className="h-[18px] w-[18px]" /> : <BellOff className="h-[18px] w-[18px]" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-text">Notifikasi browser</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {supported ? LABEL[permission] : LABEL.unsupported}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            enabled ? 'bg-online/10 text-online' : 'bg-panel text-muted-2',
          )}
        >
          {enabled ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      <div className="border-t border-border/60 px-5 py-3">
        <p className="text-[10.5px] leading-relaxed text-muted-2">
          Notifikasi muncul saat pesan baru masuk <strong>selama tab ChatYuk masih
          terbuka</strong> (boleh di latar belakang). Push latar belakang penuh belum aktif
          karena butuh kunci VAPID di server.
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {!enabled ? (
            <Button
              size="sm"
              disabled={busy || !supported || permission === 'denied'}
              onClick={() => void enable()}
            >
              <Bell className="h-3.5 w-3.5" />
              Aktifkan notifikasi
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={disable}>
              <BellOff className="h-3.5 w-3.5" />
              Nonaktifkan
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            disabled={!enabled}
            onClick={() =>
              showLocalNotification({
                title: 'ChatYuk',
                body: 'Ini contoh notifikasi. Klik untuk fokus ke tab ChatYuk.',
                tag: 'chatyuk-test',
              })
            }
          >
            <Send className="h-3.5 w-3.5" />
            Kirim contoh
          </Button>
        </div>

        {permission === 'denied' ? (
          <p className="mt-2 text-[10.5px] leading-relaxed text-warning">
            Browser memblokir notifikasi untuk situs ini. Buka ikon gembok di address bar →
            Notifikasi → Izinkan, lalu muat ulang halaman.
          </p>
        ) : null}
      </div>
    </section>
  )
}
