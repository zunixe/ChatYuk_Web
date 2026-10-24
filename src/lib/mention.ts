/**
 * Utilitas mention `@` — port dari Android `lib/utils/mention.dart`.
 *
 * Kontrak bentuk (dikunci di UI):
 * - Token = `@` + nickname apa adanya (nickname boleh berisi spasi).
 * - Deteksi token aktif (autocomplete) berhenti di spasi/baris baru.
 * - `@all` / `@everyone` hanya mention bila `allowAll` true (grup).
 */

export interface Mention {
  uid: string
  name: string
}

export const MENTION_ALL_TOKENS = ['@all', '@everyone'] as const

const MAX_QUERY_LEN = 40

function isBoundary(char: string): boolean {
  if (!char) return true
  return !/[0-9A-Za-z_]/.test(char)
}

/** Token `@…` yang sedang diketik pada posisi `cursor`. */
export function activeMentionToken(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  if (cursor <= 0 || cursor > text.length) return null
  let index = cursor - 1
  const floor = cursor - MAX_QUERY_LEN - 2
  while (index >= 0 && index >= floor) {
    const char = text[index]
    if (char === '@') {
      if (index === 0 || isBoundary(text[index - 1])) {
        const query = text.slice(index + 1, cursor)
        if (query.includes('\n') || query.length > MAX_QUERY_LEN) return null
        return { start: index, query }
      }
      return null
    }
    if (char === '\n' || char.trim() === '') return null
    index -= 1
  }
  return null
}

/** Filter kandidat: prefix nama dulu, lalu prefix kata, lalu mengandung. */
export function filterMentionCandidates(
  candidates: Mention[],
  query: string,
  limit = 6,
): Mention[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return candidates.slice(0, limit)
  const prefix: Mention[] = []
  const wordPrefix: Mention[] = []
  const contains: Mention[] = []
  for (const candidate of candidates) {
    const name = candidate.name.toLowerCase()
    if (name.startsWith(needle)) prefix.push(candidate)
    else if (name.split(/\s+/).some((word) => word.startsWith(needle))) {
      wordPrefix.push(candidate)
    } else if (name.includes(needle)) contains.push(candidate)
  }
  return [...prefix, ...wordPrefix, ...contains].slice(0, limit)
}

/** Ambil daftar mention valid dari payload jsonb. */
export function mentionsFrom(raw: unknown): Mention[] {
  if (!Array.isArray(raw)) return []
  const out: Mention[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const uid = typeof row.uid === 'string' ? row.uid : ''
    const name = typeof row.name === 'string' ? row.name : ''
    if (uid) out.push({ uid, name })
  }
  return out
}

export type MentionSegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string }

/**
 * Pecah teks menjadi segmen teks biasa & mention (untuk highlight).
 * Mention bernama dicocokkan dengan batas kata ("Budi Santoso" > "Budi"),
 * lalu `@all`/`@everyone` bila `allowAll`.
 */
export function splitMentions(
  text: string,
  mentions: Mention[],
  allowAll = false,
): MentionSegment[] {
  if (!text) return []
  const hasToken = text.includes('@')
  if (!hasToken) return [{ kind: 'text', text }]

  const lower = text.toLowerCase()
  const marks: Array<{ start: number; end: number }> = []

  const free = (start: number, end: number) =>
    !marks.some((mark) => start < mark.end && end > mark.start)

  const sorted = [...mentions].sort((a, b) => b.name.length - a.name.length)
  for (const mention of sorted) {
    if (!mention.name) continue
    const token = `@${mention.name}`.toLowerCase()
    const found = lower.indexOf(token)
    if (found < 0) continue
    const end = found + token.length
    if (isBoundary(text[found - 1] ?? '') && isBoundary(text[end] ?? '') && free(found, end)) {
      marks.push({ start: found, end })
    }
  }

  if (allowAll) {
    for (const token of MENTION_ALL_TOKENS) {
      const found = lower.indexOf(token)
      if (found < 0) continue
      const end = found + token.length
      if (isBoundary(text[found - 1] ?? '') && isBoundary(text[end] ?? '') && free(found, end)) {
        marks.push({ start: found, end })
      }
    }
  }

  if (marks.length === 0) return [{ kind: 'text', text }]
  marks.sort((a, b) => a.start - b.start)

  const segments: MentionSegment[] = []
  let cursor = 0
  for (const mark of marks) {
    if (mark.start > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, mark.start) })
    }
    segments.push({ kind: 'mention', text: text.slice(mark.start, mark.end) })
    cursor = mark.end
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })
  return segments
}
