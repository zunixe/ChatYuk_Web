import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { sendPasswordResetEmail, updatePassword } from '@/lib/api/auth'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

/**
 * Satu halaman untuk dua keadaan (paritas `reset_password_screen.dart`):
 *  1. Belum ada sesi recovery → minta email, kirim tautan reset.
 *  2. Ada sesi recovery (Supabase menaruh token di URL hash) → password baru.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    const isRecovery = hash.includes('type=recovery') || hash.includes('access_token')

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) setRecovery(true)
      else if (isRecovery) setRecovery(true)
    })

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function requestReset() {
    if (!email.includes('@')) {
      setError('Masukkan email yang valid.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendPasswordResetEmail(email)
      toast.success(t('auth.resetSent'))
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setBusy(false)
    }
  }

  async function submitNewPassword() {
    if (password.length < 6) {
      setError(t('auth.passwordHint'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      await supabase.auth.signOut()
      toast.success(t('auth.resetDone'))
      navigate('/login/email', { replace: true })
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={recovery ? t('auth.resetTitle') : t('auth.forgotTitle')}
      subtitle={recovery ? t('auth.resetHint') : t('auth.forgotHint')}
    >

      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void (recovery ? submitNewPassword() : requestReset())
        }}
      >
        {recovery ? (
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('auth.passwordHint')}
              autoComplete="new-password"
              disabled={busy}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">{t('auth.email')}</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              disabled={busy}
            />
          </div>
        )}

        {error ? <p className="text-[11.5px] text-danger">{error}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : null}
          {recovery ? t('auth.newPassword') : t('auth.sendReset')}
        </Button>
      </form>

      <p className="mt-4 text-center">
        <Link
          to="/login/email"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}
