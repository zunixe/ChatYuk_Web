import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { useMyGroups, useRoomExplore, useJoinRoom, useRoomMembership } from '@/hooks/useGroups'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import type { Room } from '@/lib/api/groups'
import { JoinDialog } from '@/features/groups/JoinDialog'

export function GroupsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const myUid = useAuthStore((state) => state.profile?.id)
  const myCountry = useAuthStore((state) => state.profile?.country) ?? 'Indonesia'

  const [tab, setTab] = useState<'mine' | 'explore'>('mine')
  const [search, setSearch] = useState('')
  const [joinTarget, setJoinTarget] = useState<Room | null>(null)

  const mineQuery = useMyGroups(myUid)
  const exploreQuery = useRoomExplore(tab === 'explore' ? myCountry : undefined, myUid)
  const joinMutation = useJoinRoom(myUid)

  const activeQuery = tab === 'mine' ? mineQuery : exploreQuery
  const rooms = useMemo(() => {
    const list = activeQuery.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter((room) => room.name.toLowerCase().includes(term))
  }, [activeQuery.data, search])

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4.5 w-4.5" />
          </span>
          <h1 className="flex-1 text-[15px] font-semibold text-text">{t('groups.title')}</h1>
          <Link to="/chats" className="text-[12px] text-muted hover:text-text">
            {t('groups.back')}
          </Link>
        </div>

        <div className="flex gap-1 px-4">
          {(['mine', 'explore'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'relative px-3 py-2 text-[12.5px] font-medium transition',
                tab === key ? 'text-primary' : 'text-muted hover:text-text',
              )}
            >
              {key === 'mine' ? t('groups.mine') : t('groups.explore')}
              {tab === key ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="px-4 pb-3 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('groups.searchPlaceholder')}
              aria-label={t('groups.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5">
        {activeQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-text">
              {tab === 'mine' ? t('groups.empty') : t('groups.exploreEmpty')}
            </p>
            {tab === 'mine' ? (
              <p className="mt-1.5 text-[12px] text-muted">{t('groups.emptyHint')}</p>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                tab={tab}
                myUid={myUid}
                onOpen={() => navigate(`/groups/${room.id}`)}
                onJoin={() => setJoinTarget(room)}
              />
            ))}
          </ul>
        )}
      </div>

      <JoinDialog
        room={joinTarget}
        pending={joinMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setJoinTarget(null)
        }}
        onConfirm={(password) => {
          if (!joinTarget) return
          joinMutation.mutate(
            { roomId: joinTarget.id, password },
            {
              onSuccess: (result) => {
                setJoinTarget(null)
                if (result.ok) navigate(`/groups/${joinTarget.id}`)
              },
            },
          )
        }}
      />
    </div>
  )
}

function RoomRow({
  room,
  tab,
  myUid,
  onOpen,
  onJoin,
}: {
  room: Room
  tab: 'mine' | 'explore'
  myUid: string | undefined
  onOpen: () => void
  onJoin: () => void
}) {
  const { t } = useTranslation()
  const membership = useRoomMembership(tab === 'explore' ? room.id : undefined, myUid)
  const isMember = tab === 'mine' || membership.data === true

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel text-[19px]">
        {room.icon || '💬'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-medium text-text">{room.name}</span>
          {room.hasPassword ? <Lock className="h-3 w-3 shrink-0 text-muted-2" /> : null}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-muted">
          {room.lastText || room.description || room.country}
        </p>
      </div>
      {isMember ? (
        <Button size="sm" variant="secondary" onClick={onOpen}>
          {t('groups.open')}
        </Button>
      ) : (
        <Button size="sm" onClick={onJoin}>
          <Plus className="h-3.5 w-3.5" />
          {t('groups.join')}
        </Button>
      )}
    </li>
  )
}
