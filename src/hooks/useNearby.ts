import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNearbyUsers,
  getBrowserPosition,
  setShareLocation,
  updateMyLocation,
} from '@/lib/api/nearby'

/**
 * Ambil daftar orang sekitar. `enabled` hanya true setelah pengguna
 * menyetujui berbagi lokasi — tidak ada pembacaan otomatis.
 */
export function useNearbyUsers(radiusKm: number, enabled: boolean) {
  return useQuery({
    queryKey: ['nearby', radiusKm],
    enabled,
    staleTime: 30_000,
    queryFn: () => fetchNearbyUsers(radiusKm),
  })
}

/** Minta izin browser, simpan lokasi, lalu aktifkan `share_location`. */
export function useShareMyLocation(uid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const position = await getBrowserPosition()
      await updateMyLocation({ lat: position.lat, lon: position.lon, accuracy: position.accuracy })
      if (uid) await setShareLocation(uid, true)
      return position
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nearby'] })
    },
  })
}

/** Matikan berbagi lokasi (tidak mengirim posisi baru). */
export function useStopSharingLocation(uid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (uid) await setShareLocation(uid, false)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nearby'] })
    },
  })
}
