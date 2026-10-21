import { useEffect, useSyncExternalStore } from 'react'
import { updatePresence } from '@/lib/api/profiles'

const HEARTBEAT_MS = 60_000
const IDLE_AFTER_MS = 4 * 60_000

export function usePresenceHeartbeat(
  uid: string | undefined,
  currentStatus?: string | null,
): void {
  // Mode `invisible` (fitur berbayar mobile) HARUS tidak pernah ditimpa.
  // Tanpa guard ini, membuka web membuat user terlihat online lagi.
  const invisible = currentStatus === 'invisible'

  useEffect(() => {
    if (!uid) return
    if (invisible) return
    let disposed = false
    let lastActivity = Date.now()
    let lastStatus: 'online' | 'idle' | 'offline' = 'offline'

    const markOnline = () => {
      lastActivity = Date.now()
      if (disposed || lastStatus === 'online') return
      lastStatus = 'online'
      void updatePresence(uid, 'online').catch(() => {
        lastStatus = 'offline'
      })
    }

    const tick = () => {
      if (disposed) return
      const idle = document.hidden || Date.now() - lastActivity > IDLE_AFTER_MS
      const next = idle ? 'idle' : 'online'
      if (next === lastStatus && next === 'online') {
        // Tetap perbarui last_seen agar tetap terlihat online di daftar.
        void updatePresence(uid, 'online').catch(() => undefined)
        return
      }
      lastStatus = next
      void updatePresence(uid, next).catch(() => {
        lastStatus = 'offline'
      })
    }

    const onActivity = () => {
      lastActivity = Date.now()
      if (lastStatus !== 'online') markOnline()
    }

    const onVisibility = () => {
      if (!document.hidden) onActivity()
    }

    markOnline()
    const interval = window.setInterval(tick, HEARTBEAT_MS)
    window.addEventListener('pointerdown', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity)
    window.addEventListener('touchstart', onActivity, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      window.clearInterval(interval)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('touchstart', onActivity)
      document.removeEventListener('visibilitychange', onVisibility)
      void updatePresence(uid, 'offline').catch(() => undefined)
    }
  }, [uid, invisible])
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

