import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { config } from '@/lib/runtime-config'

/** Paket aplikasi Android ChatYuk. */
const PLAY_PACKAGE = 'com.chatyuk.chatyuk'

/**
 * URL Play Store aplikasi ChatYuk.
 * `referrer` dipakai agar atribusi instal dari web tercatat (utm_source=web),
 * dan Play langsung menampilkan tombol "Instal".
 */
const PLAY_URL =
  `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}` +
  '&referrer=utm_source%3Dchatyuk-web%26utm_medium%3Dsidebar'

/**
 * Buka Play Store langsung. Di Android, skema `market://` membuka aplikasi
 * Play Store asli (lebih cepat + tombol Instal), dengan fallback ke web.
 */
export function openPlayStore(): void {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  if (isAndroid) {
    const market = `market://details?id=${PLAY_PACKAGE}&referrer=utm_source%3Dchatyuk-web`
    window.location.href = market
    // Bila Play Store tidak terpasang, kembali ke versi web.
    window.setTimeout(() => {
      window.location.href = PLAY_URL
    }, 1200)
    return
  }
  window.open(PLAY_URL, '_blank', 'noopener,noreferrer')
}

/** Logo Google Play resmi (warna penuh) — dipakai badge & tombol. */
export function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={cn('shrink-0', className)} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1z"
      />
      <path
        fill="#FBBC04"
        d="M104.6 499 325.3 277.7l60.1 60.1L104.6 499z"
      />
      <path
        fill="#4285F4"
        d="M104.6 13c-4.1 5.9-6.5 13.2-6.5 21.4v443.2c0 8.2 2.4 15.5 6.5 21.4l221.4-221.4L104.6 13z"
      />
      <path
        fill="#34A853"
        d="m443.9 226.7-57.9-33.3-60.7 60.7 60.7 60.7 57.9-33.3c18.6-10.7 18.6-27.9 0-54.8z"
      />
    </svg>
  )
}

/**
 * Badge "Dapatkan di Google Play" untuk sidebar.
 * Gaya mengikuti tombol store resmi (latar gelap, sudut membulat, dua baris
 * teks kecil) namun tetap serasi dengan tema panel.
 */
export function PlayStoreBadge({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <a
      href={PLAY_URL}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(event) => {
        event.preventDefault()
        openPlayStore()
      }}
      title="Unduh aplikasi ChatYuk di Google Play"
      aria-label={t('play.aria')}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-xl border border-border bg-panel/70 px-2.5 py-2 transition',
        'hover:border-primary/30 hover:bg-panel hover:shadow-[0_8px_20px_-14px_rgb(33_150_243/0.9)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
    >
      <GooglePlayIcon className="h-5 w-5" />
      <span className="min-w-0 leading-tight">
        <span className="block text-[8.5px] font-medium uppercase tracking-[0.06em] text-muted-2">
          {t('play.getItOn')}
        </span>
        <span className="block truncate text-[11px] font-semibold text-text">{t('play.googlePlay')}</span>
      </span>
    </a>
  )
}

/** Versi ringkas: hanya ikon (dipakai bila ruang sempit). */
export function PlayStoreIconLink({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <a
      href={PLAY_URL}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(event) => {
        event.preventDefault()
        openPlayStore()
      }}
      title={t('play.aria')}
      aria-label={t('play.aria')}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text',
        className,
      )}
    >
      <GooglePlayIcon className="h-[18px] w-[18px]" />
    </a>
  )
}

/** True bila build ini menampilkan tautan Play (hanya di env lokal/dev). */
export { PLAY_URL }

export function showPlayBadge(): boolean {
  return config.env !== 'prod' ? true : false
}
