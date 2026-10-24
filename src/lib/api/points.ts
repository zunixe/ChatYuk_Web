import { supabase } from '@/lib/supabase'

/**
 * Poin — paritas Android `points_service.dart`.
 *
 * Sumber kebenaran saldo = `coin_ledger` (append-only). `profiles.points`
 * hanyalah cermin hasil `wallet_sync_points`.
 */

export interface LeaderboardEntry {
  uid: string
  name: string
  avatar: string
  points: number
  rank: number
}

export interface LeaderboardResult {
  scope: 'weekly' | 'alltime'
  entries: LeaderboardEntry[]
  me: LeaderboardEntry | null
}

export interface LedgerRow {
  id: number
  bucket: 'bonus' | 'topup' | 'earned' | string
  type: string
  amount: number
  refId: string | null
  createdAt: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function mapEntry(raw: unknown, index: number): LeaderboardEntry {
  const row = asRecord(raw)
  return {
    uid: asString(row.uid ?? row.user_id),
    name: asString(row.name ?? row.nickname, 'Anon'),
    avatar: asString(row.avatar),
    // RPC mengembalikan `score` (bukan points/total).
    points: asNumber(row.score ?? row.points ?? row.total),
    rank: asNumber(row.rank, index + 1),
  }
}

/** Papan peringkat poin. scope: 'weekly' | 'alltime'. */
export async function fetchPointsLeaderboard(scope: 'weekly' | 'alltime'): Promise<LeaderboardResult> {
  const { data, error } = await supabase.rpc('points_leaderboard', {
    scope,
    row_limit: 50,
  })
  if (error) throw error
  const row = asRecord(data)
  const entries = Array.isArray(row.entries) ? row.entries : []
  const meRaw = row.me
  return {
    scope: (asString(row.scope, 'weekly') as LeaderboardResult['scope']) ?? 'weekly',
    entries: entries.map(mapEntry),
    me: meRaw && typeof meRaw === 'object' ? mapEntry(meRaw, 0) : null,
  }
}

/** Riwayat poin saya (`coin_ledger`, terbaru dulu). */
export async function fetchLedgerHistory(limit = 100, offset = 0): Promise<LedgerRow[]> {
  const { data, error } = await supabase
    .from('coin_ledger')
    .select('id,bucket,type,amount,ref_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return (data ?? []).map((raw) => {
    const row = asRecord(raw)
    return {
      id: asNumber(row.id),
      bucket: asString(row.bucket, 'bonus'),
      type: asString(row.type),
      amount: asNumber(row.amount),
      refId: typeof row.ref_id === 'string' ? row.ref_id : null,
      createdAt: asString(row.created_at),
    }
  })
}
