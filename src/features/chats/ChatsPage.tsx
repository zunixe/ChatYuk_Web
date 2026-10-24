import {
  Archive,
  ArchiveRestore,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { useChats, useParticipantsMeta, unreadTotal } from '@/hooks/useChatData'
import { cn } from '@/lib/utils'
import {
  chatDisplayName,
  chatIsArchived,
  chatUnreadCount,
  otherParticipant,
} from '@/lib/api/chats'
import { resolveAvatar } from '@/lib/media'
import { useAuthStore } from '@/stores/auth'
import type { Chat } from '@/lib/types'
import { ChatListItem } from '@/features/chats/ChatListItem'

type Filter = 'all' | 'unread'

const EMPTY_CHATS: Chat[] = []

function ChatSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3.5 sm:px-5">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-panel-2" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/5 animate-pulse rounded bg-panel-2" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-panel-2" />
      </div>
    </div>
  )
}

export function ChatsPage() {
  const { t } = useTranslation()
  const profile = useAuthStore((state) => state.profile)
  const [filter, setFilter] = useState<Filter>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [term, setTerm] = useState('')
  const deferredTerm = useDeferredValue(term)

  const myUid = profile?.id
  const query = useChats(myUid)
  const chats = query.data ?? EMPTY_CHATS
  const { avatars, presence } = useParticipantsMeta(chats, myUid)
  const unread = myUid ? unreadTotal(chats, myUid) : 0

  const visibleChats = useMemo(() => {
    if (!myUid) return []
    const needle = deferredTerm.trim().toLowerCase()
    return chats.filter((chat: Chat) => {
      // Arsip disembunyikan dari daftar utama (kolom `archived_by` per-user).
      const archived = chatIsArchived(chat, myUid)
      if (showArchived !== archived) return false
      if (filter === 'unread' && chatUnreadCount(chat, myUid) === 0) return false
      if (!needle) return true
      const name = chatDisplayName(chat, myUid).toLowerCase()
      const last = (chat.last_message ?? '').toLowerCase()
      return name.includes(needle) || last.includes(needle)
    })
  }, [chats, deferredTerm, filter, myUid, showArchived])

  const archivedCount = useMemo(
    () => (myUid ? chats.filter((chat) => chatIsArchived(chat, myUid)).length : 0),
    [chats, myUid],
  )

  if (!myUid) return null

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <header className="flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 md:pt-5">
        <div className="md:hidden">
          <Logo />
        </div>
        <div className="hidden min-w-0 flex-1 md:block">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-text">Chat</h1>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {chats.length > 0 ? t('chats.conversations', { count: chats.length }) : t('chats.noConversations')}
            {unread > 0 ? ` · ${t('chats.unreadCount', { count: unread })}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowArchived((value) => !value)}
          className={cn(
            'ml-auto flex h-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11.5px] font-medium transition',
            showArchived
              ? 'bg-primary-soft text-primary'
              : 'text-muted hover:bg-panel hover:text-text',
          )}
          aria-label={showArchived ? t('chats.hideArchived') : t('chats.showArchived')}
          title={showArchived ? t('chats.hideArchived') : t('chats.showArchived')}
          aria-pressed={showArchived}
        >
          {showArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          {archivedCount > 0 ? (
            <span className="tabular-nums">{archivedCount}</span>
          ) : null}
        </button>
        <Link
          to="/new-chat"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition hover:bg-primary/15"
          aria-label={t('online.title')}
          title={t('online.title')}
        >
          <Plus className="h-5 w-5" />
        </Link>
        <Link
          to="/groups"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text"
          aria-label={t('groups.title')}
          title={t('groups.title')}
        >
          <Users className="h-5 w-5" />
        </Link>
        <Link
          to="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text md:hidden"
          aria-label={t('common.settings')}
          title={t('common.settings')}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <div className="px-3 pb-2.5 sm:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('chats.searchPlaceholder')}
            className="h-10 w-full rounded-xl border border-transparent bg-panel pl-10 pr-9 text-[13px] text-text outline-none transition placeholder:text-muted-2 focus:border-primary/30 focus:bg-surface focus:ring-2 focus:ring-primary/10"
            aria-label={t('chats.searchPlaceholder')}
          />
          {term ? (
            <button
              type="button"
              onClick={() => setTerm('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-2 hover:bg-panel-2 hover:text-text"
              aria-label={t('settings.clear')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-3 pb-2 sm:px-5">
        {(['all', 'unread'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11.5px] font-medium transition',
              filter === value
                ? 'bg-primary-soft text-primary'
                : 'text-muted hover:bg-panel hover:text-text',
            )}
          >
            {value === 'all' ? t('chats.filterAll') : t('chats.filterUnread')}
            {value === 'unread' && unread > 0 ? ` (${unread})` : ''}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain thin-scrollbar">
        {query.isLoading ? (
          <div className="divide-y divide-border/60">
            <ChatSkeleton />
            <ChatSkeleton />
            <ChatSkeleton />
            <ChatSkeleton />
            <ChatSkeleton />
            <ChatSkeleton />
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <RefreshCw className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-text">Gagal memuat daftar chat</p>
            <p className="max-w-[240px] text-xs leading-relaxed text-muted">
              Periksa koneksi ke server lalu coba lagi.
            </p>
            <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : visibleChats.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-primary">
              <MessageCircle className="h-8 w-8" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                +
              </span>
            </div>
            <h2 className="font-display text-[16px] font-semibold text-text">
              {term || filter === 'unread' ? 'Tidak ada hasil' : 'Mulai obrolan pertamamu'}
            </h2>
            <p className="mt-1.5 max-w-[250px] text-xs leading-relaxed text-muted">
              {term || filter === 'unread'
                ? t('chats.noResultHint')
                : 'Temukan teman baru lewat nama panggilan mereka, lalu sapa duluan.'}
            </p>
            {term || filter === 'unread' ? (
              <Button
                size="sm"
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  setTerm('')
                  setFilter('all')
                }}
              >
                Lihat semua
              </Button>
            ) : (
              <Link to="/new-chat" className="mt-4">
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t('chats.findFriend')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {visibleChats.map((chat) => {
              const other = otherParticipant(chat, myUid)
              return (
                <ChatListItem
                  key={chat.chat_id}
                  chat={chat}
                  myUid={myUid}
                  avatar={resolveAvatar(avatars[other])}
                  presence={presence[other] ?? null}
                />
              )
            })}
          </div>
        )}

        {query.isFetching && !query.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner className="text-primary" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
