import { supabase } from '@/lib/supabase'

/**
 * Orang sekitar (Nearby) — paritas `location_service.dart`.
 *
 * PRIVASI (penting):
 * - Server hanya mengembalikan **jarak**, bukan koordinat orang lain.
 * - Posisi saya hanya dikirim setelah pengguna menekan tombol setuju
 *   (tidak otomatis saat halaman dibuka).
 * - `p_source` hanya menerima `'gps'` atau `'ip'` (validasi server).
 */

export interface NearbyUser {
  uid: string
  nickname: string
  gender: string
  age: number
  country: string
  city: string
  status: string
  avatar: string
  isRegistered: boolean
  lastSeen: string | null
  distanceKm: number
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

/** Simpan lokasi saya (dipakai HANYA atas persetujuan pengguna). */
export async function updateMyLocation(input: {
  lat: number
  lon: number
  accuracy?: number
  source?: 'gps' | 'ip'
}): Promise<void> {
  const { error } = await supabase.rpc('update_my_location', {
    p_lat: input.lat,
    p_lon: input.lon,
    p_source: input.source ?? 'gps',
    p_ip: '',
    p_mocked: false,
    p_accuracy: input.accuracy ?? null,
  })
  if (error) throw error
}

/** Aktif/nonaktifkan berbagi lokasi (`profiles.share_location`). */
export async function setShareLocation(uid: string, value: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ share_location: value }).eq('id', uid)
  if (error) throw error
}

/** Daftar orang sekitar dalam radius km (server hanya memberi jarak). */
export async function fetchNearbyUsers(radiusKm = 10, limit = 50): Promise<NearbyUser[]> {
  const { data, error } = await supabase.rpc('nearby_users', {
    p_radius_km: radiusKm,
    p_limit: limit,
  })
  if (error) throw error
  return (Array.isArray(data) ? data : []).map((raw) => {
    const row = asRecord(raw)
    return {
      uid: asString(row.uid),
      nickname: asString(row.nickname, 'Anon'),
      gender: asString(row.gender),
      age: asNumber(row.age),
      country: asString(row.country),
      city: asString(row.city),
      status: asString(row.status, 'offline'),
      avatar: asString(row.avatar),
      isRegistered: Boolean(row.is_registered),
      lastSeen: typeof row.last_seen === 'string' ? row.last_seen : null,
      distanceKm: asNumber(row.distance_km),
    }
  })
}

/** Ambil posisi browser (butuh izin pengguna). */
export function getBrowserPosition(): Promise<{ lat: number; lon: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat tidak mendukung lokasi.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        }),
      () => reject(new Error('Gagal mengambil lokasi. Izinkan akses lokasi.')),
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  })
}
