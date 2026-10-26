/**
 * Notifikasi browser (B11) — lapisan yang bisa diuji TANPA server push.
 *
 * Yang tersedia sekarang (berfungsi penuh):
 * - Izin Notification API + preferensi tersimpan (`localStorage`)
 * - Notifikasi LOKAL saat pesan baru masuk selama tab disembunyikan
 *
 * Yang BELUM aktif (menunggu konfigurasi):
 * - Push latar belakang (butuh VAPID keypair + pengirim dari server).
 *   `features.webPush` di `runtime-config.js` sengaja masih `false`.
 */

const STORAGE_KEY = 'chatyuk-notif-enabled'

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotifPermission {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission as NotifPermission
}

/** Preferensi pengguna (terpisah dari izin browser). */
export function notificationsEnabled(): boolean {
  if (!notificationsSupported()) return false
  if (Notification.permission !== 'granted') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setNotificationsEnabled(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* localStorage bisa diblokir */
  }
}

/** Minta izin browser. Return izin terbaru. */
export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!notificationsSupported()) return 'unsupported'
  const result = await Notification.requestPermission()
  return result as NotifPermission
}

export interface LocalNotificationInput {
  title: string
  body: string
  /** Id chat/grup — dipakai untuk menghindari notifikasi ganda. */
  tag: string
  /** Path tujuan saat notifikasi diklik. */
  url?: string
}

/**
 * Tampilkan notifikasi dari halaman (bukan push).
 * Klik → fokus ke tab ChatYuk dan navigasi ke chat terkait.
 */
export function showLocalNotification(input: LocalNotificationInput): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const notification = new Notification(input.title, {
      body: input.body,
      tag: input.tag,
      icon: '/app-icon.png',
      badge: '/app-icon.png',
      silent: false,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
      if (input.url) {
        window.dispatchEvent(new CustomEvent('chatyuk:navigate', { detail: input.url }))
      }
    }
    window.setTimeout(() => notification.close(), 8000)
  } catch {
    /* Sebagian browser memblokir Notification dari halaman; abaikan. */
  }
}
