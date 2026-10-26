import { MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { GooglePlayIcon, openPlayStore } from '@/components/brand/PlayStoreBadge'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChatsPage } from '@/features/chats/ChatsPage'

export function ChatsEmptyState() {
  const { t } = useTranslation()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-bg px-8 text-center">
      <div className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-primary/8 blur-[90px]" />
      <div className="pointer-events-none absolute -right-12 bottom-8 h-72 w-72 rounded-full bg-accent/8 blur-[100px]" />

      <div className="relative">
        <LogoMark size={64} radius={22} />
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-accent text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      </div>

      <h2 className="mt-6 font-display text-[22px] font-semibold tracking-tight text-text">
        {t('chats.emptyTitle')}
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        {t('chats.emptyHint')}
      </p>

      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row">
        <Link to="/online">
          <Button>
            <MessageSquareText className="h-4 w-4" />
            {t('chats.startNew')}
          </Button>
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('chats.secure')}
        </div>
      </div>

      {/* Unduh aplikasi Android — badge resmi di halaman utama */}
      <a
        href="https://play.google.com/store/apps/details?id=com.chatyuk.chatyuk&referrer=utm_source%3Dchatyuk-web%26utm_medium%3Dhome"
        target="_blank"
        rel="noreferrer noopener"
        onClick={(event) => {
          event.preventDefault()
          openPlayStore()
        }}
        className="group mt-8 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-[0_10px_30px_-22px_rgb(15_23_42/0.6)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_16px_34px_-22px_rgb(33_150_243/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label={t('play.aria')}
      >
        <GooglePlayIcon className="h-6 w-6" />
        <span className="text-left leading-tight">
          <span className="block text-[9px] font-medium uppercase tracking-[0.08em] text-muted-2">
            {t('play.getItOn')}
          </span>
          <span className="block text-[13px] font-semibold text-text">{t('play.googlePlay')}</span>
        </span>
      </a>

      <div className="mt-10 grid max-w-md grid-cols-3 gap-3 text-left">
        {[
          ['Cepat', 'Pesan realtime tanpa jeda'],
          ['Ringan', 'Nyaman di desktop & ponsel'],
          ['Privat', 'Kendali penuh privasimu'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-border bg-surface/70 p-3">
            <div className="text-[12px] font-semibold text-text">{title}</div>
            <div className="mt-1 text-[10.5px] leading-relaxed text-muted">{body}</div>
          </div>
        ))}
      </div>

      <p className="absolute bottom-4 text-[10px] text-muted-2">
        ChatYuk Web · dibuat untuk ngobrol tanpa ribet
      </p>
    </div>
  )
}

export function ChatsLayout() {
  const { chatId } = useParams()

  return (
    <div className="flex h-full min-h-0">
      <section
        className={cn(
          'h-full w-full shrink-0 border-r border-border bg-surface md:w-[360px] lg:w-[392px]',
          chatId ? 'hidden md:block' : 'block',
        )}
      >
        <ChatsPage />
      </section>
      <section className={cn('min-w-0 flex-1 bg-bg', chatId ? 'flex' : 'hidden md:flex')}>
        {chatId ? <Outlet /> : <ChatsEmptyState />}
      </section>
    </div>
  )
}
