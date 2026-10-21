import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessageCirclePlus, Search, Settings, Sparkles, Users, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { CountryMultiSelect } from '@/features/chats/CountryMultiSelect'
import { GenderDropdown, type GenderFilter } from '@/features/chats/GenderDropdown'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { useAvatars, useOnlineUsers, usePresenceFor, useUserSearch } from '@/hooks/useChatData'
import { useBlockedSet } from '@/hooks/useBlocks'
import { ensureChat } from '@/lib/api/chats'
import { errorMessage } from '@/lib/errors'
import { resolveAvatar } from '@/lib/media'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import type { OnlineUser } from '@/lib/types'

type Tab = 'online' | 'search'

function UserRow({
  user,
  avatar,
  status,
  lastSeen,
  busy,
  disabled,
  onSelect,
}: {
  user: OnlineUser
  avatar?: string | null
  status: string
  lastSeen: string | null
  busy: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const genderText = user.gender === 'male' ? 'Laki-laki' : user.gender === 'female' ? 'Perempuan' : ''
  const meta = [genderText, user.age ? `${user.age} th` : null, user.city, user.country]
    .filter(Boolean)
    .join(' · ')
  const isOnline = status === 'online'
  const isIdle = status === 'idle'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Avatar src={avatar} name={user.nickname} size={46} online={isOnline} gender={user.gender} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-medium text-text">{user.nickname}</span>
          {user.gender === 'male' || user.gender === 'female' ? (
            <span
              className={
                user.gender === 'male'
                  ? 'shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-sky-600 dark:text-sky-400'
                  : 'shrink-0 rounded-full bg-pink-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-pink-600 dark:text-pink-400'
              }
              aria-label={genderText}
              title={genderText}
            >
              {user.gender === 'male' ? 'L' : 'P'}
            </span>
          ) : null}
          {isOnline ? (
            <span className="shrink-0 rounded-full bg-online/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-online">
              Online
            </span>
          ) : isIdle ? (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Idle
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-muted">
          {meta || 'Pengguna ChatYuk'}
          {!isOnline && lastSeen ? ` · ${lastSeen}` : ''}
        </div>
        {user.about ? (
          <div className="mt-0.5 truncate text-[11px] text-muted-2">{user.about}</div>
        ) : null}
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
        {busy ? <Spinner className="h-4 w-4" /> : <MessageCirclePlus className="h-[18px] w-[18px]" />}
      </span>
    </button>
  )
}

export function NewChatPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profile = useAuthStore((state) => state.profile)
  const [tab, setTab] = useState<Tab>('online')
  // Filter negara = MULTI-select (mobile: `_negaraSel`), kosong = semua.
  const [countries, setCountries] = useState<string[]>([])
  const [term, setTerm] = useState('')
  // Filter gender — sama seperti mobile: all | male | female (single-select).
  const [gender, setGender] = useState<GenderFilter>('all')
  const [startingUid, setStartingUid] = useState<string | null>(null)
  const deferredTerm = useDeferredValue(term)

  const myUid = profile?.id
  const onlineQuery = useOnlineUsers(null)
  const searchQuery = useUserSearch(deferredTerm, myUid)

  const blockedSet = useBlockedSet(myUid)
  const users = useMemo(() => {
    const source = tab === 'search' ? (searchQuery.data ?? []) : (onlineQuery.data ?? [])
    return source.filter((user) => {
      if (user.id === myUid) return false
      if (user.is_registered === false) return false
      if (blockedSet.has(user.id)) return false
      // Sama seperti mobile: cocok bila country ada di daftar pilihan.
      if (countries.length > 0 && !countries.includes(String(user.country ?? ''))) return false
      if (gender !== 'all' && user.gender !== gender) return false
      return true
    })
  }, [myUid, onlineQuery.data, searchQuery.data, tab, blockedSet, gender, countries])

  const uids = useMemo(() => users.map((user) => user.id), [users])
  const avatarsQuery = useAvatars(uids)
  const presenceQuery = usePresenceFor(uids)

  const isLoading = tab === 'search' ? searchQuery.isLoading : onlineQuery.isLoading
  const isError = tab === 'search' ? searchQuery.isError : onlineQuery.isError
  const canSearch = deferredTerm.trim().length >= 2

  async function startChat(user: OnlineUser) {
    if (!myUid || startingUid) return
    setStartingUid(user.id)
    try {
      const chat = await ensureChat(myUid, user.id)
      await queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      queryClient.setQueryData(['chat', chat.chat_id], chat)
      navigate(`/chats/${chat.chat_id}`)
      toast.success(`Obrolan dengan ${user.nickname} siap.`)
    } catch (error) {
      toast.error(errorMessage(error))
      setStartingUid(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 pb-10 pt-[max(0.9rem,env(safe-area-inset-top))] sm:px-6 md:pt-6">
        <header className="flex items-start gap-3">
          <Link
            to="/chats"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text md:hidden"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[24px] font-semibold tracking-tight text-text">
              Online
            </h1>
            <p className="mt-0.5 text-[12px] text-muted">
              Pengguna yang sedang online — pilih untuk mulai chat atau cari lewat nama.
            </p>
          </div>
          <Link
            to="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text md:hidden"
            aria-label="Pengaturan"
            title="Pengaturan"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value)
              if (event.target.value.trim()) setTab('search')
            }}
            placeholder="Ketik nama panggilan (min. 2 huruf)…"
            className="h-11 w-full rounded-2xl border border-border bg-surface pl-10 pr-10 text-[13.5px] text-text outline-none transition placeholder:text-muted-2 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            aria-label="Cari pengguna"
          />
          {term ? (
            <button
              type="button"
              onClick={() => {
                setTerm('')
                setTab('online')
              }}
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-2 hover:bg-panel hover:text-text"
              aria-label="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTab('online')
              setTerm('')
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition',
              tab === 'online' ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-panel',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Online
          </button>
          <button
            type="button"
            onClick={() => setTab('search')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition',
              tab === 'search' ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-panel',
            )}
          >
            <Search className="h-3.5 w-3.5" />
            Cari nama
          </button>
        </div>

        {/* Filter berdampingan — sama persis dengan layar Online Android:
            Negara (multi-select 141, checklist + cari + Reset/Terapkan)
            dan Gender (single-select 3 opsi). */}
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <CountryMultiSelect selected={countries} onApply={setCountries} />
          </div>
          <div className="min-w-0 flex-1">
            <GenderDropdown value={gender} onChange={setGender} />
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-surface p-1.5 shadow-sm sm:p-2">
          {tab === 'search' && !canSearch ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Search className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[13px] font-medium text-text">Ketik minimal 2 huruf</p>
              <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-muted">
                Pencarian memakai nama panggilan. Hasil hanya menampilkan pengguna terdaftar.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-1 p-1">
              {[0, 1, 2, 3, 4].map((key) => (
                <div key={key} className="flex items-center gap-3 rounded-2xl px-3 py-3">
                  <div className="h-[46px] w-[46px] animate-pulse rounded-full bg-panel-2" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-panel-2" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-panel-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <p className="text-[13px] font-medium text-text">Gagal memuat pengguna</p>
              <p className="mt-1 text-[11.5px] text-muted">Periksa koneksi lalu coba lagi.</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-4"
                onClick={() => void (tab === 'search' ? searchQuery.refetch() : onlineQuery.refetch())}
              >
                Coba lagi
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-panel text-muted">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[13px] font-medium text-text">
                {tab === 'search' ? 'Nama tidak ditemukan' : 'Belum ada yang online'}
              </p>
              <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-muted">
                {tab === 'search'
                  ? 'Coba ejaan lain atau ajak temanmu bergabung ke ChatYuk.'
                  : 'Coba lihat semua negara, atau cari teman lewat nama panggilan.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {users.map((user) => {
                const presence = presenceQuery.data?.[user.id]
                const avatar = resolveAvatar(avatarsQuery.data?.[user.id] || user.avatar)
                return (
                  <UserRow
                    key={user.id}
                    user={user}
                    avatar={avatar}
                    status={presence?.status ?? (user.status === 'online' ? 'online' : 'offline')}
                    lastSeen={
                      presence?.last_seen
                        ? new Date(presence.last_seen).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : null
                    }
                    busy={startingUid === user.id}
                    disabled={Boolean(startingUid)}
                    onSelect={() => void startChat(user)}
                  />
                )
              })}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[10.5px] leading-relaxed text-muted-2">
          Percakapan 1:1 dibuat otomatis saat kamu memilih teman. Tidak ada pesan yang dikirim
          sebelum kamu mengetik.
        </p>
      </div>
    </div>
  )
}
