import { supabase } from '@/lib/supabase'

/** Field privasi yang didukung RPC `replace_privacy_exclusions`. */
export type PrivacyField =
  | 'presence'
  | 'last_seen'
  | 'profile_photo'
  | 'about'
  | 'story'
  | 'leaderboard'
  | 'call'

export type PrivacyVisibility =
  | 'everyone'
  | 'everyone_except'
  | 'friends'
  | 'friends_except'
  | 'only'
  | 'nobody'

/** Opsi yang butuh daftar orang (exclusion / whitelist). */
export function needsPeople(value: PrivacyVisibility): 'except' | 'only' | null {
  if (value === 'everyone_except' || value === 'friends_except') return 'except'
  if (value === 'only') return 'only'
  return null
}

export interface PersonOption {
  uid: string
  nickname: string
  avatar: string | null
  source: 'friend' | 'following' | 'chat'
}

/**
 * Kandidat untuk picker privasi: teman + following (paging `p_offset`)
 * digabung dengan riwayat chat yang sudah ada di klien.
 */
export async function fetchPrivacyCandidates(
  myUid: string,
  chatPeople: PersonOption[] = [],
  limitPerPage = 50,
): Promise<PersonOption[]> {
  const merged = new Map<string, PersonOption>()

  const add = (person: PersonOption) => {
    if (!person.uid || person.uid === myUid) return
    const existing = merged.get(person.uid)
    if (!existing) {
      merged.set(person.uid, person)
      return
    }
    // Prioritas sumber: teman > following > riwayat chat.
    const rank = { friend: 0, following: 1, chat: 2 } as const
    if (rank[person.source] < rank[existing.source]) merged.set(person.uid, person)
  }

  for (const person of chatPeople) add(person)

  for (const kind of ['friends', 'following'] as const) {
    try {
      const { data, error } = await supabase.rpc('social_list', {
        p_kind: kind,
        p_user: myUid,
        p_limit: limitPerPage,
        p_offset: 0,
      })
      if (error) continue
      const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
      for (const row of rows) {
        add({
          uid: String(row.uid ?? ''),
          nickname: String(row.nickname ?? 'Pengguna'),
          avatar: row.avatar ? String(row.avatar) : null,
          source: kind === 'friends' ? 'friend' : 'following',
        })
      }
    } catch {
      // kandidat opsional: bila gagal, minimal riwayat chat tetap tampil
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const rank = { friend: 0, following: 1, chat: 2 } as const
    if (rank[a.source] !== rank[b.source]) return rank[a.source] - rank[b.source]
    return a.nickname.localeCompare(b.nickname, 'id')
  })
}

/** Simpan daftar orang untuk satu field privasi. */
export async function replaceExclusions(field: PrivacyField, uids: string[]): Promise<void> {
  const { error } = await supabase.rpc('replace_privacy_exclusions', {
    p_field: field,
    p_uids: uids,
  })
  if (error) throw error
}
