import { MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChatsPage } from '@/features/chats/ChatsPage'

export function ChatsEmptyState() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-bg px-8 text-center">
      <div className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-primary/8 blur-[90px]" />
      <div className="pointer-events-none absolute -right-12 bottom-8 h-72 w-72 rounded-full bg-accent/8 blur-[100px]" />

      <div className="relative">
        <LogoMark className="h-16 w-16 rounded-[22px]" />
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-accent text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      </div>

      <h2 className="mt-6 font-display text-[22px] font-semibold tracking-tight text-text">
        Selamat datang di ChatYuk Web
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        Pilih obrolan di samping untuk melanjutkan, atau mulai percakapan baru dengan temanmu.
      </p>

      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row">
        <Link to="/new-chat">
          <Button>
            <MessageSquareText className="h-4 w-4" />
            Mulai chat baru
          </Button>
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Terhubung aman ke ChatYuk
        </div>
      </div>

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
