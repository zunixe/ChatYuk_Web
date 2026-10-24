import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { GoogleButton } from '@/features/auth/GoogleButton'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { errorMessage } from '@/lib/errors'
import { signInWithPassword } from '@/lib/api/auth'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Isi email dan password terlebih dahulu.')
      return
    }
    setLoading(true)
    try {
      await signInWithPassword(email.trim(), password)
      navigate('/new-chat', { replace: true })
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }


  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-3 text-[13px] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-2" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nama@email.com"
              className="pl-10"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <span className="mb-1.5 text-[11px] text-muted-2">{t('auth.passwordHint')}</span>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-2" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-10 pr-11"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-2 transition hover:bg-panel hover:text-text"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            to="/reset-password"
            className="text-[11.5px] font-medium text-primary transition hover:text-primary-strong"
          >
            {t('auth.forgot')}
          </Link>
        </div>

        <Button type="submit" className="mt-1 w-full" size="lg" disabled={loading}>
          {loading ? <Spinner /> : null}
          {loading ? t('auth.signingIn') : t('auth.signIn')}
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">{t('auth.orContinue')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton disabled={loading} />

      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary hover:text-primary-strong">
          {t('auth.registerFree')}
        </Link>
      </p>

      <p className="mt-4 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('auth.startAsGuest')}
        </Link>
      </p>

      <div className="mt-6 rounded-xl border border-border bg-panel/60 px-3.5 py-3 text-[11px] leading-relaxed text-muted-2">
        Dengan masuk, kamu menyetujui ketentuan ChatYuk. Jangan gunakan akun milik orang
        lain. Sesi ini aman selama perangkatmu tidak dipakai bersama.
      </div>
    </AuthLayout>
  )
}
