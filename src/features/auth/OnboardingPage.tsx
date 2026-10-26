import { AlertCircle, ArrowRight, LogOut, Sparkles, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { RegionFields } from '@/features/auth/RegionFields'
import { registerProfile } from '@/lib/api/profiles'
import { isBannedNickname, isValidNickname } from '@/lib/nickname'
import { getCities } from '@/lib/regions'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const GENDERS = [
  { value: 'female', label: 'Perempuan' },
  { value: 'male', label: 'Laki-laki' },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const signOut = useAuthStore((state) => state.signOut)

  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [gender, setGender] = useState(profile?.gender ?? 'male')
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '')
  const [country, setCountry] = useState(profile?.country ?? 'Indonesia')
  const [city, setCity] = useState(profile?.city ?? getCities(profile?.country ?? 'Indonesia')[0] ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    if (!gender) {
      setError('Pilih jenis kelamin terlebih dahulu.')
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
      await registerProfile({
        nickname: cleanNickname,
        gender,
        age: numericAge,
        country: country.trim(),
        city: city.trim(),
      })
      await refreshProfile()
      toast.success('Profil siap. Selamat mengobrol!')
      navigate('/online', { replace: true })
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent/10 blur-[110px]" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo subtitle="Web" />
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-muted transition hover:bg-panel hover:text-text"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10">
        <div className="w-full max-w-xl">
          <div className="mb-6 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-muted">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Satu langkah lagi
            </span>
            <h1 className="font-display text-[27px] font-semibold tracking-tight text-text">
              Lengkapi profilmu
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Data ini membantu teman menemukanmu dan membuat obrolan terasa lebih personal.
            </p>
            {user?.is_anonymous ? (
              <p className="mx-auto mt-3 max-w-md rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-300">
                Kamu masuk sebagai akun anonim. Jika keluar, akun ini tidak bisa dipulihkan.
              </p>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-7"
          >
            {error ? (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-3 text-[13px] text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="space-y-5">
              <div>
                <Label htmlFor="nickname">Nama panggilan</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-2" />
                  <Input
                    id="nickname"
                    className="pl-10"
                    placeholder="Contoh: Raka"
                    maxLength={20}
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-2">3–20 karakter, tampil di daftar chat.</p>
              </div>

              <div>
                <Label>Jenis kelamin</Label>
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
                      {option.label}
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
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
              {loading ? <Spinner /> : null}
              {loading ? 'Menyimpan profil…' : 'Mulai mengobrol'}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-2">
              Kamu bisa mengubah nama, foto, dan pengaturan privasi nanti di menu Pengaturan.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
