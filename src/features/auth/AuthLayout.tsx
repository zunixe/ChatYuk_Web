import { MessageCircleMore, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { AnimatedLogo, Logo, LogoMark } from '@/components/brand/Logo'
import { config, envLabel } from '@/lib/runtime-config'
import { cn } from '@/lib/utils'

const YEAR = new Date().getFullYear()
const SUPABASE_HOST = (() => {
  try {
    return new URL(config.supabaseUrl).host
  } catch {
    return config.supabaseUrl
  }
})()

const FEATURES = [
  { icon: Zap, title: 'Realtime tanpa jeda', text: 'Pesan, typing, dan tanda dibaca langsung tersinkron.' },
  { icon: MessageCircleMore, title: 'Nyaman di semua layar', text: 'Tata letak dua panel yang rapi, dari HP sampai desktop.' },
  { icon: ShieldCheck, title: 'Privasi terkendali', text: 'Atur siapa yang bisa melihat status dan foto profil.' },
]

export function AuthLayout({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string
  subtitle: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="relative flex min-h-dvh items-stretch bg-bg">
      <section className="relative hidden w-[46%] max-w-[620px] flex-col justify-between overflow-hidden bg-[#07131f] px-12 py-10 text-white lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/30 blur-[90px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent/20 blur-[110px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:34px_34px]" />

        <div className="relative flex items-center gap-3">
          <LogoMark size={44} radius={14} className="shadow-lg" />
          <div>
            <p className="font-display text-lg font-semibold">ChatYuk Web</p>
            <p className="text-xs text-white/60">Obrolan yang tetap dekat.</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
            <Sparkles className="h-3.5 w-3.5" /> Ringan, cepat, dan dekat
          </p>
          <h1 className="font-display text-[34px] font-semibold leading-[1.12] tracking-tight">
            Ngobrol lancar,
            <br />
            di mana pun kamu.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Semua percakapan ChatYuk-mu kini hadir di browser. Tanpa install, tanpa ribet —
            cukup masuk dan lanjutkan obrolan.
          </p>

          <div className="mt-9 space-y-3.5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <feature.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">{feature.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-white/40">
          © {YEAR} ChatYuk · {envLabel} · {SUPABASE_HOST}
        </p>
      </section>

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:hidden">
          <Logo subtitle="Web" />
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted">
            {envLabel}
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8">
          <div className={cn('w-full', wide ? 'max-w-[520px]' : 'max-w-[400px]')}>
            {/* Header auth — susunan Android (auth_header.dart): logo,
                tagline, dan sub-tagline SEMUANYA rata tengah. */}
            <div className="mb-7 text-center">
              <div className="mb-3 flex justify-center">
                <AnimatedLogo size={56} />
              </div>
              <h2 className="font-display text-[26px] font-semibold tracking-tight text-text">
                {title}
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>

        <footer className="px-5 pb-6 text-center text-[11px] text-muted-2 lg:hidden">
          {envLabel} · {new URL(config.supabaseUrl).host}
        </footer>
      </section>
    </div>
  )
}
