import { AlertCircle, ArrowRight, Mail, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { GoogleButton } from '@/features/auth/GoogleButton'
import { RegionFields } from '@/features/auth/RegionFields'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { registerProfile } from '@/lib/api/profiles'
import { errorMessage } from '@/lib/errors'
import { isBannedNickname, isValidNickname } from '@/lib/nickname'
import { getCities } from '@/lib/regions'
import { signInAnonymously } from '@/lib/api/auth'
import { fetchAppSettings } from '@/lib/api/app-settings'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const GENDERS = [
  { value: 'female', labelKey: 'common.female' },
  { value: 'male', labelKey: 'common.male' },
] as const

export function WelcomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState<string>('male')
  const [age, setAge] = useState('18')
  const [country, setCountry] = useState('Indonesia')
  const [city, setCity] = useState(() => getCities('Indonesia')[0] ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requireRegistration, setRequireRegistration] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchAppSettings().then((settings) => {
      if (!cancelled) setRequireRegistration(settings.requireRegistration)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requireRegistration) {
      setError('Daftar dengan email atau Google untuk mulai chat.')
      return
    }
    setError(null)

    const cleanNickname = nickname.trim().replace(/\s+/g, ' ')
    const numericAge = Number.parseInt(age, 10)

    if (!isValidNickname(cleanNickname)) {
      setError('Nama panggilan 3–20 karakter, hanya huruf, angka, spasi, _ atau -.')
      return
    }
    if (isBannedNickname(cleanNickname)) {
      setError('Nama panggilan itu tidak diperbolehkan.')
      return
    }
    if (!Number.isFinite(numericAge) || numericAge < 13 || numericAge > 99) {
      setError('Umur harus antara 13 dan 99 tahun.')
      return
    }
    if (!country.trim()) {
      setError('Negara wajib diisi.')
      return
    }
    if (!city.trim()) {
      setError('Kota wajib diisi.')
      return
    }

    setLoading(true)
    try {
      await signInAnonymously('chatyuk-web-entry')

      await registerProfile({
        nickname: cleanNickname,
        gender,
        age: numericAge,
        country: country.trim(),
        city: city.trim(),
      })
      await refreshProfile()
      toast.success('Selamat datang di ChatYuk!')
      navigate('/online', { replace: true })
    } catch (submitError) {
      setError(errorMessage(submitError))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.tagline')}
      subtitle={t('auth.subtagline')}
    >
      <form onSubmit={handleStart} className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-3 text-[13px] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div>
          <Label htmlFor="welcome-nickname">{t('auth.username')}</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-2" />
            <Input
              id="welcome-nickname"
              className="pl-10"
              placeholder={t('auth.nicknamePlaceholder')}
              maxLength={20}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        <div>
          <Label>{t('auth.gender')}</Label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGender(option.value)}
                disabled={loading}
                className={cn(
                  'h-11 rounded-xl border text-[13px] font-medium transition',
                  gender === option.value
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-surface text-muted hover:bg-panel',
                )}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <RegionFields
          age={age}
          country={country}
          city={city}
          onAgeChange={setAge}
          onCountryChange={(value) => {
            setCountry(value)
            setCity(getCities(value)[0] ?? '')
          }}
          onCityChange={setCity}
          disabled={loading}
        />

        {requireRegistration ? (
          <p className="rounded-xl bg-warning/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-warning">
            Pendaftaran wajib aktif. Silakan daftar, atau masuk sebagai tamu lalu hubungkan akun dari
            Pengaturan.
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={loading || requireRegistration}>
          {loading ? <Spinner /> : null}
          {loading ? t('auth.preparing') : t('auth.startChat')}
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-2">
          {t('auth.anonWarning')}
        </p>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">{t('auth.orContinue')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2.5">
        <GoogleButton disabled={loading} />
        <Link
          to="/register"
          className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full')}
        >
          <Mail className="h-4 w-4" />
          {t('auth.registerEmail')}
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login/email" className="font-medium text-primary hover:text-primary-strong">
          {t('auth.loginHere')}
        </Link>
      </p>
    </AuthLayout>
  )
}
