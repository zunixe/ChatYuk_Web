import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Info,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { Switch } from '@/components/ui/switch'
import {
  fetchPrivacySettings,
  updatePrivacySetting,
  updateProfile,
  updateReadReceipts,
} from '@/lib/api/profiles'
import { errorMessage } from '@/lib/errors'
import { resolveAvatar, uploadAvatar } from '@/lib/media'
import { isBannedNickname, isValidNickname } from '@/lib/nickname'
import { markProfileRegistered, updateAccountCredentials } from '@/lib/api/auth'
import { MAX_AVATAR_BYTES } from '@/lib/constants'
import { config, envLabel, supabaseHost } from '@/lib/runtime-config'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useUiStore, type ThemeMode } from '@/stores/ui'
import type { PrivacySettings } from '@/lib/types'

const PRIVACY_OPTIONS = [
  ['everyone', 'Semua orang'],
  ['everyone_except', 'Semua kecuali…'],
  ['friends', 'Teman'],
  ['friends_except', 'Teman kecuali…'],
  ['only', 'Hanya…'],
  ['nobody', 'Tidak ada'],
] as const

const PRIVACY_FIELDS: Array<{ key: 'presence' | 'last_seen' | 'profile_photo' | 'about'; label: string; hint: string }> = [
  { key: 'presence', label: 'Status online', hint: 'Siapa yang bisa melihat kamu sedang online.' },
  { key: 'last_seen', label: 'Terakhir dilihat', hint: 'Siapa yang bisa melihat waktu terakhir aktif.' },
  { key: 'profile_photo', label: 'Foto profil', hint: 'Siapa yang bisa melihat foto profilmu.' },
  { key: 'about', label: 'Tentang', hint: 'Siapa yang bisa membaca bio singkatmu.' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const signOut = useAuthStore((state) => state.signOut)
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)

  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [about, setAbout] = useState(profile?.about ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(resolveAvatar(profile?.avatar))
  const fileRef = useRef<HTMLInputElement>(null)

  const privacyQuery = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: fetchPrivacySettings,
    staleTime: 60_000,
  })
  const [privacy, setPrivacy] = useState<PrivacySettings>({})
  const [savingPrivacy, setSavingPrivacy] = useState<string | null>(null)
  const [secureEmail, setSecureEmail] = useState('')
  const [securePassword, setSecurePassword] = useState('')
  const [securing, setSecuring] = useState(false)
  const [secureError, setSecureError] = useState<string | null>(null)

  useEffect(() => {
    if (privacyQuery.data) setPrivacy(privacyQuery.data)
  }, [privacyQuery.data])

  useEffect(() => {
    setNickname(profile?.nickname ?? '')
    setAbout(profile?.about ?? '')
  }, [profile?.nickname, profile?.about])

  useEffect(() => {
    setAvatarPreview(resolveAvatar(profile?.avatar))
  }, [profile?.avatar])

  const displayName = profile?.nickname || user?.email || 'Pengguna'

  async function handleProfileSave() {
    if (!profile) return
    const clean = nickname.trim().replace(/\s+/g, ' ')
    if (!isValidNickname(clean)) {
      toast.error('Nama panggilan 3–20 karakter, hanya huruf, angka, spasi, _ atau -.')
      return
    }
    if (isBannedNickname(clean)) {
      toast.error('Nama panggilan itu tidak diperbolehkan.')
      return
    }
    if (about.length > 160) {
      toast.error('Tentang maksimal 160 karakter.')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile(profile.id, { nickname: clean, about })
      await refreshProfile()
      toast.success('Profil diperbarui.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleAvatarChange(file: File | undefined) {
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Ukuran gambar maksimal 5 MB.')
      return
    }
    setUploading(true)
    const localPreview = URL.createObjectURL(file)
    setAvatarPreview(localPreview)
    try {
      const path = await uploadAvatar(profile.id, file)
      await updateProfile(profile.id, { avatar: path })
      const next = await refreshProfile()
      setAvatarPreview(resolveAvatar(next?.avatar) ?? localPreview)
      toast.success('Foto profil diperbarui.')
    } catch (error) {
      setAvatarPreview(resolveAvatar(profile.avatar))
      toast.error(errorMessage(error))
    } finally {
      URL.revokeObjectURL(localPreview)
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handlePrivacyChange(
    key: 'presence' | 'last_seen' | 'profile_photo' | 'about',
    value: string,
  ) {
    const previous = privacy[key]
    setPrivacy((current) => ({ ...current, [key]: value }))
    setSavingPrivacy(key)
    try {
      await updatePrivacySetting(key, value)
      toast.success('Pengaturan privasi disimpan.')
    } catch (error) {
      setPrivacy((current) => ({ ...current, [key]: previous }))
      toast.error(errorMessage(error))
    } finally {
      setSavingPrivacy(null)
    }
  }

  async function handleSecureAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setSecureError(null)
    const cleanEmail = secureEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSecureError('Format email belum benar.')
      return
    }
    if (securePassword.length < 6) {
      setSecureError('Password minimal 6 karakter.')
      return
    }
    setSecuring(true)
    try {
      const { emailConfirmed } = await updateAccountCredentials(cleanEmail, securePassword)
      if (!emailConfirmed) {
        toast.success('Cek email kamu untuk mengonfirmasi akun ini.')
        setSecureEmail('')
        setSecurePassword('')
        return
      }
      await markProfileRegistered(profile.id, cleanEmail)
      await refreshProfile()
      setSecureEmail('')
      setSecurePassword('')
      toast.success('Akun berhasil diamankan. Kamu bisa masuk dengan email ini.')
    } catch (error) {
      setSecureError(errorMessage(error))
    } finally {
      setSecuring(false)
    }
  }

  async function handleReadReceipts(enabled: boolean) {
    const previous = privacy.read_receipts ?? true
    setPrivacy((current) => ({ ...current, read_receipts: enabled }))
    setSavingPrivacy('read_receipts')
    try {
      await updateReadReceipts(enabled)
    } catch (error) {
      setPrivacy((current) => ({ ...current, read_receipts: previous }))
      toast.error(errorMessage(error))
    } finally {
      setSavingPrivacy(null)
    }
  }

  async function handleSignOut() {
    if (!window.confirm('Keluar dari ChatYuk Web di perangkat ini?')) return
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  if (!profile) return null

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-[max(0.9rem,env(safe-area-inset-top))] sm:px-6 md:pt-6">
        <header className="flex items-center gap-3">
          <Link
            to="/chats"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text md:hidden"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-[24px] font-semibold tracking-tight text-text">
              Pengaturan
            </h1>
            <p className="mt-0.5 text-[12px] text-muted">Profil, privasi, dan tampilan aplikasi.</p>
          </div>
        </header>

        <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-4 border-b border-border/70 p-5">
            <div className="relative">
              <Avatar src={avatarPreview} name={displayName} size={68} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-white shadow transition hover:bg-primary-strong disabled:opacity-60"
                aria-label="Ubah foto profil"
              >
                {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleAvatarChange(event.target.files?.[0])}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[17px] font-semibold text-text">
                {displayName}
              </div>
              <div className="truncate text-[12px] text-muted">{user?.email ?? 'Tanpa email'}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-muted-2">
                <Shield className="h-3 w-3" />
                {user?.is_anonymous || !profile.is_registered
                  ? 'Akun anonim'
                  : 'Akun terverifikasi'}
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <Label htmlFor="settings-nickname">Nama panggilan</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
                <Input
                  id="settings-nickname"
                  className="pl-10"
                  value={nickname}
                  maxLength={20}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="settings-about">Tentang</Label>
              <Textarea
                id="settings-about"
                rows={3}
                maxLength={160}
                placeholder="Ceritakan sedikit tentang dirimu…"
                value={about}
                onChange={(event) => setAbout(event.target.value)}
              />
              <div className="mt-1 text-right text-[10.5px] text-muted-2">{about.length}/160</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] leading-relaxed text-muted-2">
                Perubahan nama terlihat oleh teman di daftar chat.
              </p>
              <Button
                size="sm"
                onClick={() => void handleProfileSave()}
                disabled={savingProfile}
              >
                {savingProfile ? <Spinner /> : <Check className="h-4 w-4" />}
                Simpan
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Shield className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-text">Privasi</h2>
              <p className="text-[11px] text-muted">Atur siapa yang bisa melihat informasimu.</p>
            </div>
          </div>

          {privacyQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="text-primary" />
            </div>
          ) : privacyQuery.isError ? (
            <div className="px-5 py-6 text-center">
              <p className="text-[12px] text-muted">Pengaturan privasi tidak dapat dimuat.</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => void privacyQuery.refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {PRIVACY_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-text">{field.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{field.hint}</div>
                  </div>
                  <div className="relative shrink-0">
                    <select
                      value={privacy[field.key] ?? 'everyone'}
                      onChange={(event) => void handlePrivacyChange(field.key, event.target.value)}
                      disabled={savingPrivacy === field.key}
                      className="h-9 max-w-[150px] appearance-none rounded-lg border border-border bg-surface pl-3 pr-8 text-[12px] text-text outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                    >
                      {PRIVACY_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-2" />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-text">Laporan dibaca</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    Kirim centang biru saat pesan sudah kamu baca.
                  </div>
                </div>
                <Switch
                  checked={privacy.read_receipts ?? true}
                  onCheckedChange={(value) => void handleReadReceipts(value)}
                  disabled={savingPrivacy === 'read_receipts'}
                  aria-label="Laporan dibaca"
                />
              </div>
            </div>
          )}
        </section>

        {!profile.is_registered ? (
          <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <KeyRound className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-text">Amankan akun</h2>
                <p className="text-[11px] text-muted">
                  Akun anonim tidak bisa dipulihkan setelah keluar. Tambahkan email dan password
                  agar data tetap aman.
                </p>
              </div>
            </div>
            <form onSubmit={handleSecureAccount} className="space-y-3 p-5">
              {secureError ? (
                <div className="rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-2.5 text-[12.5px] text-danger">
                  {secureError}
                </div>
              ) : null}
              <div>
                <Label htmlFor="secure-email">Email</Label>
                <Input
                  id="secure-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nama@email.com"
                  value={secureEmail}
                  onChange={(event) => setSecureEmail(event.target.value)}
                  disabled={securing}
                />
              </div>
              <div>
                <Label htmlFor="secure-password">Password</Label>
                <Input
                  id="secure-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimal 6 karakter"
                  value={securePassword}
                  onChange={(event) => setSecurePassword(event.target.value)}
                  disabled={securing}
                />
              </div>
              <Button type="submit" size="sm" disabled={securing}>
                {securing ? <Spinner /> : <KeyRound className="h-4 w-4" />}
                {securing ? 'Menyimpan…' : 'Simpan email & password'}
              </Button>
            </form>
          </section>
        ) : null}

        <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              {theme === 'dark' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-text">Tampilan</h2>
              <p className="text-[11px] text-muted">Pilih tema yang paling nyaman.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4">
            {(
              [
                ['light', 'Terang', Sun],
                ['dark', 'Gelap', Moon],
                ['system', 'Sistem', Monitor],
              ] as Array<[ThemeMode, string, typeof Sun]>
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[11.5px] font-medium transition',
                  theme === value
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-border bg-surface text-muted hover:bg-panel',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel text-muted">
              <Info className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold text-text">Tentang ChatYuk Web</h2>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {envLabel} · {supabaseHost()}
              </p>
            </div>
            <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-medium text-muted-2">
              v0.1.0
            </span>
          </div>
          <div className="border-t border-border/60 px-5 py-3 text-[10.5px] leading-relaxed text-muted-2">
            Percakapan 1:1 tanpa enkripsi ujung-ke-ujung. Jangan kirim informasi sensitif.
            Fitur panggilan, polling, dan push notification belum aktif di versi web.
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(config.features).map(([key, enabled]) => (
                <span
                  key={key}
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9.5px]',
                    enabled ? 'bg-online/10 text-online' : 'bg-panel text-muted-2',
                  )}
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
        </section>

        <Button
          variant="secondary"
          className="mt-4 w-full text-danger hover:bg-danger/8 hover:text-danger"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4" />
          Keluar dari akun
        </Button>

        <p className="mt-5 text-center text-[10px] text-muted-2">
          Dibuat dengan hati untuk ngobrol tanpa ribet.
        </p>
      </div>
    </div>
  )
}
