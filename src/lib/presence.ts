/**
 * Status presence efektif — meniru `ChatService.effectiveStatusOf` di mobile:
 * - `invisible` diperlakukan offline bagi orang lain
 * - `last_seen` lebih tua dari 30 menit dianggap offline (heartbeat mati)
 */
export const STALE_AFTER_MS = 30 * 60 * 1000

export type EffectiveStatus = 'online' | 'idle' | 'offline'

export function effectiveStatus(
  status: string | null | undefined,
  lastSeen?: string | null,
  now: number = Date.now(),
): EffectiveStatus {
  const raw = (status ?? 'offline').toLowerCase()
  if (raw === 'invisible' || raw === 'offline' || !raw) return 'offline'

  if (lastSeen) {
    const seen = new Date(lastSeen).getTime()
    if (Number.isFinite(seen) && now - seen > STALE_AFTER_MS) return 'offline'
  }
  if (raw === 'online') return 'online'
  if (raw === 'idle') return 'idle'
  return 'offline'
}

export function isEffectivelyOnline(
  status: string | null | undefined,
  lastSeen?: string | null,
): boolean {
  return effectiveStatus(status, lastSeen) === 'online'
}
