import { cn } from '@/lib/utils'

const APP_ICON = '/app-icon.png'

/**
 * Logo aplikasi — memakai aset yang SAMA dengan Android
 * (`chatyuk/assets/app_icon.png`), bukan ikon SVG buatan.
 *
 * Acuan tampilan Android (`lib/widgets/auth_header.dart` → `AnimatedLogo`):
 * - ukuran 56×56, sudut membulat 16px (`ClipRRect` radius 16)
 * - dibungkus lingkaran tipis warna primary 8%
 * - animasi halus: ayun kiri-kanan, mengambang naik-turun, denyut opacity
 */
export function LogoMark({
  className,
  size = 40,
  radius = 14,
}: {
  className?: string
  size?: number
  radius?: number
}) {
  return (
    <img
      src={APP_ICON}
      alt="ChatYuk"
      width={size}
      height={size}
      draggable={false}
      className={cn('shrink-0 select-none object-cover', className)}
      style={{ borderRadius: radius }}
    />
  )
}

/** Logo + nama (dipakai header & sidebar). */
export function Logo({
  className,
  subtitle,
}: {
  className?: string
  subtitle?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className="font-display text-[17px] font-semibold tracking-tight text-text">
          ChatYuk
        </div>
        {subtitle ? <div className="text-[11px] font-medium text-muted">{subtitle}</div> : null}
      </div>
    </div>
  )
}

/**
 * Logo animasi untuk halaman masuk/pendaftaran — meniru `AnimatedLogo`
 * Android: lingkaran primary 8% + ikon 56px sudut 16px, dengan gerak
 * mengayun, naik-turun, dan denyut opacity (periode 2.6 dtk).
 */
export function AnimatedLogo({
  size = 56,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn('logo-glow inline-flex items-center justify-center', className)}
      style={{ padding: size * 0.11, borderRadius: '50%', background: 'rgb(33 150 243 / 0.08)' }}
    >
      <img
        src={APP_ICON}
        alt="ChatYuk"
        width={size}
        height={size}
        draggable={false}
        className="logo-float select-none object-cover"
        style={{ borderRadius: 16, width: size, height: size }}
      />
    </span>
  )
}
