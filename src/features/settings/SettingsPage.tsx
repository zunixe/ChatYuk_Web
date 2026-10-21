import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Info,
  KeyRound,
  LogOut,
  Languages,
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
import { RegionFields } from '@/features/auth/RegionFields'
import { getCities } from '@/lib/regions'
import { needsPeople, replaceExclusions, type PrivacyVisibility } from '@/lib/api/privacy'
import type { PrivacyKey } from '@/lib/api/profiles'
import { PrivacyPeoplePicker } from '@/features/settings/PrivacyPeoplePicker'
import { usePrivacyCandidates } from '@/hooks/usePrivacyCandidates'
import { changePassword, deleteMyAccount, markProfileRegistered, updateAccountCredentials } from '@/lib/api/auth'
import { MAX_AVATAR_BYTES } from '@/lib/constants'
import { config, envLabel, supabaseHost } from '@/lib/runtime-config'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useUiStore, type ThemeMode } from '@/stores/ui'
import { setLanguage, type Lang } from '@/lib/i18n'
import type { PrivacySettings } from '@/lib/types'

const PRIVACY_OPTIONS = [
  ['everyone', 'Semua orang'],
  ['everyone_except', 'Semua kecuali…'],
  ['friends', 'Teman'],
  ['friends_except', 'Teman kecuali…'],
  ['only', 'Hanya…'],
  ['nobody', 'Tidak ada'],
] as const

// 7 field — sama dengan aplikasi Android
// (presence, last_seen, profile_photo, about, story, leaderboard, call).
const PRIVACY_FIELDS: Array<{ key: PrivacyKey; label: string; hint: string }> = [
  { key: 'presence', label: 'Status online', hint: 'Siapa yang bisa melihat kamu sedang online.' },
  { key: 'last_seen', label: 'Terakhir dilihat', hint: 'Siapa yang bisa melihat waktu terakhir aktif.' },
  { key: 'profile_photo', label: 'Foto profil', hint: 'Siapa yang bisa melihat foto profilmu.' },
  { key: 'about', label: 'Tentang', hint: 'Siapa yang bisa membaca bio singkatmu.' },
  { key: 'story', label: 'Story', hint: 'Siapa yang bisa melihat story-mu.' },
  { key: 'leaderboard', label: 'Papan peringkat', hint: 'Siapa yang bisa melihat posisimu di leaderboard.' },
  { key: 'call', label: 'Panggilan', hint: 'Siapa yang boleh meneleponmu.' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const signOut = useAuthStore((state) => state.signOut)
  const theme = useUiStore((state) => state.theme)
  const [lang, setLangState] = useState<Lang>(
    () => (document.documentElement.lang === 'id' ? 'id' : 'en') as Lang,
  )
  const setTheme = useUiStore((state) => state.setTheme)

  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [about, setAbout] = useState(profile?.about ?? '')
  const [gender, setGender] = useState<string>(profile?.gender ?? 'male')
  const [age, setAge] = useState<string>(profile?.age ? String(profile.age) : '18')
  const [country, setCountry] = useState(profile?.country ?? 'Indonesia')
  const [city, setCity] = useState(
    profile?.city ?? getCities(profile?.country ?? 'Indonesia')[0] ?? '',
  )
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
  const [pickerField, setPickerField] = useState<PrivacyKey | null>(null)
  const [pickerMode, setPickerMode] = useState<'except' | 'only'>('except')
  // Nilai visibilitas yang menunggu daftar orang (mis. 'only' / '*_except').
  const [pendingVisibility, setPendingVisibility] = useState<Record<string, string>>({})
  const [savingPeople, setSavingPeople] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
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
    setGender(profile?.gender ?? 'male')
    setAge(profile?.age ? String(profile.age) : '18')
    setCountry(profile?.country ?? 'Indonesia')
    setCity(profile?.city ?? getCities(profile?.country ?? 'Indonesia')[0] ?? '')
  }, [profile?.gender, profile?.age, profile?.country, profile?.city])

  useEffect(() => {
    setAvatarPreview(resolveAvatar(profile?.avatar))
  }, [profile?.avatar])

  const displayName = profile?.nickname || user?.email || 'Pengguna'
  const candidates = usePrivacyCandidates(profile?.id)

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
    const numericAge = Number.parseInt(age, 10)
    if (!Number.isFinite(numericAge) || numericAge < 13 || numericAge > 99) {
      toast.error('Umur harus antara 13 dan 99 tahun.')
      return
    }
    if (!country.trim() || !city.trim()) {
      toast.error('Negara dan kota wajib diisi.')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile(profile.id, {
        nickname: clean,
        about,
        gender,
        age: numericAge,
        country,
        city,
      })
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

  async function handlePrivacyChange(key: PrivacyKey, value: string) {
    // `only` tanpa daftar orang selalu ditolak server ("only requires at least
    // one person"). Cegah di klien: buka picker dulu, jangan simpan.
    if (value === 'only') {
      const current = privacy.exclusions?.[key]
      if (!Array.isArray(current) || current.length === 0) {
        setPickerMode('only')
        setPickerField(key)
        setPendingVisibility((pending) => ({ ...pending, [key]: value }))
        // Cerminkan pilihan di UI supaya dropdown tidak kembali ke nilai lama.
        setPrivacy((current) => ({ ...current, [key]: value }))
        toast.info('Pilih minimal satu orang dulu.')
        return
      }
    }
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
    const mode = needsPeople(value as PrivacyVisibility)
    if (mode) {
      setPickerMode(mode)
      setPickerField(key)
    } else {
      setPickerField((current) => (current === key ? null : current))
    }
  }

  async function savePeople(uids: string[]) {
    if (!pickerField) return
    setSavingPeople(true)
    try {
      // Simpan daftar orang DULU, baru nilai visibilitasnya. Urutan ini penting:
      // `only` ditolak server bila belum ada whitelist, dan sebaliknya
      // `everyone_except` sudah bermakna sejak awal.
      await replaceExclusions(pickerField, uids)
      const value = (pendingVisibility[pickerField] ?? privacy[pickerField] ?? 'everyone') as string
      const shouldApply = value !== 'everyone'
      if (shouldApply) {
        await updatePrivacySetting(pickerField, value)
      }
      await privacyQuery.refetch()
      await refreshProfile()
      setPendingVisibility((pending) => {
        const next = { ...pending }
        delete next[pickerField]
        return next
      })
      toast.success(
        shouldApply ? 'Pengaturan privasi disimpan.' : 'Daftar orang disimpan.',
      )
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSavingPeople(false)
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

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPwError(null)
    const email = user?.email ?? ''
    if (!email) {
      setPwError('Akun ini tidak punya password (login Google).')
      return
    }
    if (newPw.length < 6) {
      setPwError('Password baru minimal 6 karakter.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Konfirmasi password belum sama.')
      return
    }
    setPwSaving(true)
    try {
      await changePassword(email, curPw, newPw)
      setCurPw('')
      setNewPw('')
      setConfirmPw('')
      setPwOpen(false)
      toast.success('Password diperbarui.')
    } catch (error) {
      const msg = errorMessage(error)
      setPwError(
        msg.includes('password salah') || msg.includes('kredensial')
          ? 'Password saat ini salah.'
          : msg,
      )
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== 'HAPUS') return
    setDeleting(true)
    try {
      await deleteMyAccount()
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
      setDeleting(false)
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
              <Avatar src={avatarPreview} name={displayName} size={68} gender={profile?.gender} />
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
            <div>
              <Label>Jenis kelamin</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['female', 'Perempuan'],
                  ['male', 'Laki-laki'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    disabled={savingProfile}
                    className={
                      gender === value
                        ? 'h-11 rounded-xl border border-primary bg-primary-soft text-[13px] font-medium text-primary'
                        : 'h-11 rounded-xl border border-border bg-surface text-[13px] font-medium text-muted transition hover:bg-panel'
                    }
                  >
                    {label}
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
              disabled={savingProfile}
            />

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
              {PRIVACY_FIELDS.map((field) => {
                const value = (privacy[field.key] ?? 'everyone') as PrivacyVisibility
                const mode = needsPeople(value)
                const excluded = Array.isArray(privacy.exclusions?.[field.key])
                  ? (privacy.exclusions?.[field.key] as string[])
                  : []
                const onlyInvalid = mode === 'only' && excluded.length === 0
                return (
                  <div key={field.key} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-text">{field.label}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{field.hint}</div>
                      </div>
                      <div className="relative shrink-0">
                        <select
                          value={value}
                          onChange={(event) => void handlePrivacyChange(field.key, event.target.value)}
                          disabled={savingPrivacy === field.key}
                          className="h-9 max-w-[150px] appearance-none rounded-lg border border-border bg-surface pl-3 pr-8 text-[12px] text-text outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                        >
                          {PRIVACY_OPTIONS.map(([optionValue, label]) => (
                            <option key={optionValue} value={optionValue}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-2" />
                      </div>
                    </div>

                    {mode || pickerField === field.key ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            if (pickerField === field.key) {
                              setPickerField(null)
                              return
                            }
                            setPickerMode(mode ?? 'except')
                            setPickerField(field.key)
                          }}
                        >
                          {(pickerField === field.key ? pickerMode : mode) === 'only'
                            ? 'Pilih yang boleh lihat'
                            : 'Pilih yang dikecualikan'} ({excluded.length})
                        </Button>
                        {excluded.length > 0 ? (
                          <span className="text-[11px] text-muted-2">
                            {excluded.slice(0, 3).map((uid) => {
                              const person = candidates.people.find((p) => p.uid === uid)
                              return person?.nickname ?? 'Pengguna'
                            }).join(', ')}
                            {excluded.length > 3 ? ` +${excluded.length - 3}` : ''}
                          </span>
                        ) : null}
                        {onlyInvalid ? (
                          <span className="text-[11px] font-medium text-danger">
                            Minimal 1 orang agar pengaturan ini berlaku.
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <PrivacyPeoplePicker
                      open={pickerField === field.key}
                      mode={pickerField === field.key ? pickerMode : (mode ?? 'except')}
                      people={candidates.people}
                      selected={excluded}
                      loading={candidates.isLoading}
                      onToggle={(uid) => {
                        const next = excluded.includes(uid)
                          ? excluded.filter((item) => item !== uid)
                          : [...excluded, uid]
                        setPrivacy((current) => ({
                          ...current,
                          exclusions: { ...(current.exclusions ?? {}), [field.key]: next },
                        }))
                      }}
                      onClear={() =>
                        setPrivacy((current) => ({
                          ...current,
                          exclusions: { ...(current.exclusions ?? {}), [field.key]: [] },
                        }))
                      }
                      onDone={() => {
                        void savePeople(
                          Array.isArray(privacy.exclusions?.[field.key])
                            ? (privacy.exclusions?.[field.key] as string[])
                            : [],
                        )
                        setPickerField(null)
                      }}
                    />
                    {savingPeople && pickerField === field.key ? (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                        <Spinner className="h-3 w-3" /> Menyimpan…
                      </div>
                    ) : null}
                  </div>
                )
              })}
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

        {/* Bahasa — EN (default) / ID, sama seperti aplikasi Android */}
        <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Languages className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-text">Language / Bahasa</h2>
              <p className="text-[11px] text-muted">English (default) · Bahasa Indonesia</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {([
              ['en', 'English'],
              ['id', 'Bahasa Indonesia'],
            ] as Array<[Lang, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLanguage(value)
                  setLangState(value)
                }}
                className={cn(
                  'h-11 rounded-xl border text-[12.5px] font-medium transition',
                  lang === value
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-border bg-surface text-muted hover:bg-panel',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

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

        {/* Akun & keamanan — setara layar Account Android */}
        <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Shield className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-text">Akun & keamanan</h2>
              <p className="text-[11px] text-muted">Password dan penghapusan akun.</p>
            </div>
          </div>

          <div className="p-5">
            {!user?.email ? (
              <p className="text-[11.5px] leading-relaxed text-muted">
                Akun ini masuk lewat Google, jadi tidak punya password.
              </p>
            ) : pwOpen ? (
              <form onSubmit={handleChangePassword} className="space-y-3">
                {pwError ? (
                  <div className="rounded-xl border border-danger/20 bg-danger/8 px-3.5 py-2.5 text-[12.5px] text-danger">
                    {pwError}
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="cur-pw">Password saat ini</Label>
                  <Input
                    id="cur-pw"
                    type="password"
                    autoComplete="current-password"
                    value={curPw}
                    onChange={(event) => setCurPw(event.target.value)}
                    disabled={pwSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="new-pw">Password baru</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
                    value={newPw}
                    onChange={(event) => setNewPw(event.target.value)}
                    disabled={pwSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-pw">Ulangi password baru</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPw}
                    onChange={(event) => setConfirmPw(event.target.value)}
                    disabled={pwSaving}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={pwSaving}>
                    {pwSaving ? <Spinner /> : <Check className="h-4 w-4" />}
                    {pwSaving ? 'Menyimpan…' : 'Simpan password'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPwOpen(false)
                      setPwError(null)
                      setCurPw('')
                      setNewPw('')
                      setConfirmPw('')
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setPwOpen(true)}>
                <KeyRound className="h-4 w-4" />
                Ganti password
              </Button>
            )}

            <div className="mt-4 border-t border-border/60 pt-4">
              {deleteOpen ? (
                <div className="space-y-3">
                  <p className="text-[11.5px] leading-relaxed text-danger">
                    Akun, profil, pesan, dan media akan dihapus permanen dan tidak bisa
                    dipulihkan.
                  </p>
                  <div>
                    <Label htmlFor="delete-confirm">Ketik HAPUS untuk melanjutkan</Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirm}
                      onChange={(event) => setDeleteConfirm(event.target.value)}
                      placeholder="HAPUS"
                      disabled={deleting}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={deleting || deleteConfirm.trim().toUpperCase() !== 'HAPUS'}
                      onClick={() => void handleDeleteAccount()}
                    >
                      {deleting ? <Spinner /> : null}
                      {deleting ? 'Menghapus…' : 'Hapus akun permanen'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDeleteOpen(false)
                        setDeleteConfirm('')
                      }}
                      disabled={deleting}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="text-[11.5px] font-medium text-danger underline-offset-2 hover:underline"
                >
                  Hapus akun saya
                </button>
              )}
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
