import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!EMAIL_RE.test(cleanEmail)) {
      setError('Format email belum benar.')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (password !== confirm) {
      setError('Konfirmasi password belum sama.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { signup_source: 'chatyuk-web' },
        },
      })
      if (signUpError) throw signUpError
      if (data.session) {
        navigate('/onboarding', { replace: true })
      } else {
        setSentTo(cleanEmail)
      }
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        title="Cek email kamu"
        subtitle="Satu langkah lagi untuk mulai mengobrol di ChatYuk Web."
      >
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-online/10 text-online">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-sm leading-relaxed text-text">
            Kami mengirim tautan verifikasi ke <strong className="font-medium">{sentTo}</strong>.
            Buka tautan tersebut, lalu masuk kembali ke ChatYuk Web.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Tidak menemukan emailnya? Periksa folder spam atau tunggu beberapa saat sebelum
            meminta ulang.
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <Link to="/login/email" className="text-sm font-medium text-primary hover:text-primary-strong">
            Kembali ke halaman masuk
          </Link>
          <button
            type="button"
            className="text-xs text-muted underline-offset-4 hover:underline"
            onClick={() => setSentTo(null)}
          >
            Ganti email
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Buat akun ChatYuk"
      subtitle="Gratis, cepat, dan langsung terhubung dengan teman-temanmu."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-3 text-[13px] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
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
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-2" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimal 6 karakter"
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

        <div>
          <Label htmlFor="confirm">Ulangi password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-2" />
            <Input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Ketik ulang password"
              className="pl-10"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <Button type="submit" className="mt-1 w-full" size="lg" disabled={loading}>
          {loading ? <Spinner /> : null}
          {loading ? 'Membuat akun…' : 'Daftar sekarang'}
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Sudah punya akun?{' '}
        <Link to="/login/email" className="font-medium text-primary hover:text-primary-strong">
          Masuk
        </Link>
      </p>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-2">
        Setelah mendaftar, kamu akan melengkapi profil singkat (nama panggilan, umur, dan
        lokasi) agar teman mudah menemukanmu.
      </p>
    </AuthLayout>
  )
}
