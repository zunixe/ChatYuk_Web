import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, History, Trophy } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/feedback'
import { useLedgerHistory, usePointsLeaderboard } from '@/hooks/usePoints'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

/**
 * Papan peringkat + riwayat poin — paritas `leaderboard_screen.dart` dan
 * `point_history_screen.dart`. Data dari `points_leaderboard` RPC dan
 * `coin_ledger` (bukan `profiles.points` yang hanya cermin).
 */
export function PointsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const [scope, setScope] = useState<'weekly' | 'alltime'>('weekly')
  const [tab, setTab] = useState<'board' | 'history'>('board')

  const board = usePointsLeaderboard(scope)
  const history = useLedgerHistory(profile?.id)
  const myUid = profile?.id

  const rows = useMemo(() => {
    const list = board.data?.entries ?? []
    return list.map((entry, index) => ({ ...entry, rank: entry.rank || index + 1 }))
  }, [board.data])

  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-muted transition hover:text-text"
            aria-label={t('groups.back')}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-4.5 w-4.5" />
          </span>
          <h1 className="flex-1 font-display text-[15px] font-semibold text-text">
            {t('points.title')}
          </h1>
          {profile ? (
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11.5px] font-medium text-primary">
              {t('points.balance')}: {profile.points ?? 0}
            </span>
          ) : null}
        </div>

        <div className="flex gap-1 px-4">
          {(
            [
              ['board', t('points.leaderboard'), Trophy],
              ['history', t('points.history'), History],
            ] as Array<['board' | 'history', string, typeof Trophy]>
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium transition',
                tab === key ? 'text-primary' : 'text-muted hover:text-text',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {tab === key ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'board' ? (
          <div className="flex gap-1.5 px-4 pb-3 pt-1">
            {(['weekly', 'alltime'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                aria-pressed={scope === value}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11.5px] transition',
                  scope === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-panel text-muted hover:border-primary/40',
                )}
              >
                {value === 'weekly' ? t('points.weekly') : t('points.alltime')}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5">
        {tab === 'board' ? (
          board.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-muted">{t('points.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {rows.map((entry) => {
                const isMe = entry.uid === myUid
                return (
                  <li
                    key={entry.uid}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2',
                      isMe ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface',
                    )}
                  >
                    <span className="w-7 shrink-0 text-center text-[13px] font-semibold text-muted">
                      {medals[entry.rank] ?? entry.rank}
                    </span>
                    <Avatar name={entry.name} size={30} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-text">
                      {entry.name}
                      {isMe ? (
                        <span className="ml-1 text-[10.5px] text-primary">({t('points.me')})</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-primary">
                      {entry.points}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        ) : history.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (history.data ?? []).length === 0 ? (
          <p className="py-10 text-center text-[12.5px] text-muted">{t('points.historyEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {(history.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2"
              >
                <span
                  className={cn(
                    'w-14 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[10px] font-medium uppercase',
                    row.amount >= 0 ? 'bg-online/15 text-online' : 'bg-danger/10 text-danger',
                  )}
                >
                  {row.bucket}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{row.type}</span>
                <span className="shrink-0 text-[10.5px] text-muted-2">
                  {new Date(row.createdAt).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span
                  className={cn(
                    'w-14 shrink-0 text-right text-[12.5px] font-semibold tabular-nums',
                    row.amount >= 0 ? 'text-online' : 'text-danger',
                  )}
                >
                  {row.amount >= 0 ? '+' : ''}
                  {row.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
