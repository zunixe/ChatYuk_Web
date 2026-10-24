import { useEffect, useState } from 'react'

/**
 * Jam berjalan untuk countdown (mis. lokasi LIVE). Nilai awal `0` agar
 * render pertama tidak membaca `Date.now()` (aturan purity React Compiler);
 * efek pertama langsung mengisi nilai sebenarnya.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    // Isi nilai awal secara asinkron (bukan setState sinkron di efek).
    const initial = window.setTimeout(() => setNow(Date.now()), 0)
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [intervalMs])

  return now
}
