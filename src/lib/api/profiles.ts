import { supabase } from '@/lib/supabase'
import type { OnlineUser, PresenceStatus, PrivacySettings, Profile } from '@/lib/types'

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('profile_public')
  if (error) throw error
  if (!data || typeof data !== 'object' || !('id' in data)) return null
  return data as Profile
}

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('profile_public', { p_user: uid })
  if (error) throw error
  if (!data || typeof data !== 'object' || !('id' in data)) return null
  return data as Profile
}

export async function fetchAvatars(uids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(uids.filter(Boolean)))
  if (unique.length === 0) return {}
  const { data, error } = await supabase.rpc('avatars_for', { p_uids: unique })
  if (error) throw error
  const map: Record<string, string> = {}
  if (Array.isArray(data)) {
    for (const row of data as Array<{ id: string; avatar: string }>) {
      if (row?.id) map[row.id] = row.avatar ?? ''
    }
  }
  return map
}

export async function fetchPresence(
  uids: string[],
): Promise<Record<string, Pick<Profile, 'id' | 'nickname' | 'status' | 'last_seen' | 'avatar' | 'about'>>> {
  const unique = Array.from(new Set(uids.filter(Boolean)))
  if (unique.length === 0) return {}
  const { data, error } = await supabase.rpc('presence_for', { p_uids: unique })
  if (error) throw error
  const map: Record<string, Pick<Profile, 'id' | 'nickname' | 'status' | 'last_seen' | 'avatar' | 'about'>> = {}
  if (Array.isArray(data)) {
    for (const row of data as Array<Record<string, unknown>>) {
      const id = row.id as string | undefined
      if (!id) continue
      map[id] = {
        id,
        nickname: (row.nickname as string) ?? '',
        status: (row.status as PresenceStatus) ?? 'offline',
        last_seen: (row.last_seen as string) ?? null,
        avatar: (row.avatar as string) ?? '',
        about: (row.about as string) ?? '',
      }
    }
  }
  return map
}

export async function fetchOnlineUsers(country?: string | null): Promise<OnlineUser[]> {
  const { data, error } = await supabase.rpc('get_online_users', {
    p_country: country?.trim() ? country.trim() : null,
    p_limit: 120,
  })
  if (error) throw error
  return Array.isArray(data) ? (data as OnlineUser[]) : []
}

export async function searchProfiles(query: string, excludeUid: string): Promise<OnlineUser[]> {
  const term = query.trim()
  if (!term) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id,nickname,gender,age,country,city,is_registered')
    .ilike('nickname', `%${term}%`)
    .neq('id', excludeUid)
    .limit(30)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    nickname: (row.nickname as string) ?? 'Pengguna',
    gender: (row.gender as string) ?? '',
    age: (row.age as number) ?? null,
    country: (row.country as string) ?? null,
    city: (row.city as string) ?? null,
    status: 'offline',
    avatar: '',
    is_registered: (row.is_registered as boolean) ?? null,
    last_seen: null,
    about: null,
  }))
}

export interface RegisterProfileInput {
  nickname: string
  gender: string
  age: number
  country: string
  city: string
}

export async function registerProfile(input: RegisterProfileInput): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sesi tidak ditemukan. Silakan masuk ulang.')

  const now = new Date().toISOString()
  const base: Record<string, unknown> = {
    id: user.id,
    nickname: input.nickname.trim(),
    gender: input.gender,
    age: input.age,
    country: input.country.trim(),
    city: input.city.trim(),
    status: 'online',
    avatar: '',
    is_registered: Boolean(user.email),
    needs_onboarding: false,
    login_at: now,
    created_at: now,
    last_seen: now,
  }

  const { error: insertError } = await supabase.from('profiles').insert(base)
  if (insertError && insertError.code !== '23505') throw insertError

  const patch: Record<string, unknown> = { ...base }
  delete patch.id
  if (user.email) patch.email = user.email

  const { error: updateError } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
  if (updateError) throw updateError

  const profile = await fetchMyProfile()
  if (!profile) throw new Error('Profil gagal dimuat setelah disimpan.')
  return profile
}

export async function updateProfile(
  uid: string,
  patch: Partial<Pick<Profile, 'nickname' | 'about' | 'avatar' | 'gender' | 'age' | 'country' | 'city'>>,
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.nickname !== undefined) payload.nickname = (patch.nickname ?? '').trim()
  if (patch.about !== undefined) payload.about = (patch.about ?? '').trim()
  if (patch.gender !== undefined) payload.gender = patch.gender
  if (patch.age !== undefined) payload.age = patch.age
  if (patch.country !== undefined) payload.country = (patch.country ?? '').trim()
  if (patch.city !== undefined) payload.city = (patch.city ?? '').trim()
  if (patch.avatar !== undefined) payload.avatar = patch.avatar
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase.from('profiles').update(payload).eq('id', uid)
  if (error) throw error
}

export async function updatePresence(uid: string, status: Exclude<PresenceStatus, 'invisible'>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status, last_seen: new Date().toISOString() })
    .eq('id', uid)
  if (error) throw error
}

export async function fetchPrivacySettings(): Promise<PrivacySettings> {
  const { data, error } = await supabase.rpc('my_privacy_settings')
  if (error) throw error
  return (data ?? {}) as PrivacySettings
}

export type PrivacyKey =
  | 'presence'
  | 'last_seen'
  | 'profile_photo'
  | 'about'
  | 'story'
  | 'leaderboard'
  | 'call'

export async function updatePrivacySetting(
  key: PrivacyKey,
  value: string,
): Promise<void> {
  const { error } = await supabase.rpc('update_privacy_settings', {
    [`p_${key}`]: value,
  })
  if (error) throw error
}

export async function updateReadReceipts(enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('update_privacy_settings', {
    p_read_receipts: enabled,
  })
  if (error) throw error
}
