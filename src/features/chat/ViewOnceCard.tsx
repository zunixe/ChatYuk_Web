import { Eye, Lock, Loader2, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { announceViewOnceSeen, expireViewOnce } from '@/lib/api/messages'
import { mediaUrlForViewOnce } from '@/lib/media'
import { viewOnceKind, type ViewOnceState } from '@/lib/view-once'
import type { Message } from '@/lib/types'

/**
 * Kartu view-once.
 *
 * Penting (privasi): selama state `locked`, aset TIDAK di-resolve/dimuat
 * sama sekali. URL baru dibuat saat pengguna mengetuk, dan setelah ditutup
 * pesan ditandai `*_once_expired` sehingga tidak bisa dibuka lagi.
 */
export function ViewOnceCard({
  message,
  isMine,
  myUid,
}: {
  message: Message
  isMine: boolean
  myUid: string
}) {
  const kind = viewOnceKind(message.type)
  const alreadyExpired = message.type === 'video_once_expired' || message.type === 'view_once_expired'
  const [state, setState] = useState<ViewOnceState>(alreadyExpired ? 'expired' : 'locked')
  const [src, setSrc] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    setState(alreadyExpired ? 'expired' : 'locked')
    setSrc(null)
    setFailed(false)
  }, [alreadyExpired, message.id])

  async function reveal() {
    if (state !== 'locked' || busy || isMine) return
    setBusy(true)
    setFailed(false)
    try {
      const url = mediaUrlForViewOnce(message)
      if (!url) {
        setFailed(true)
        return
      }
      setSrc(url)
      setState('revealed')
    } finally {
      setBusy(false)
    }
  }

  async function close() {
    if (closingRef.current) return
    closingRef.current = true
    setSrc(null)
    setState('expired')
    try {
      await expireViewOnce(message.id, kind)
      void announceViewOnceSeen(message.chat_id, message.id, myUid)
    } catch {
      // Biarkan UI tetap terkunci walau server gagal; refetch akan mengoreksi.
    } finally {
      closingRef.current = false
    }
  }

  // ── Kartu terkunci / sudah dilihat ──
  if (state !== 'revealed') {
    const expired = state === 'expired'
    return (
      <div className="flex min-w-44 items-center gap-2.5 rounded-xl bg-panel/70 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
          {expired ? <Eye className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-text">
            {expired ? 'Sudah dilihat' : kind === 'video' ? 'Video sekali lihat' : 'Foto sekali lihat'}
          </div>
          <div className="text-[10.5px] text-muted-2">
            {expired
              ? 'Media ini tidak bisa dibuka lagi'
              : isMine
                ? 'Menunggu dibuka penerima'
                : failed
                  ? 'Gagal memuat, ketuk untuk coba lagi'
                  : 'Hanya bisa dibuka satu kali'}
          </div>
        </div>
        {!expired && !isMine ? (
          <button
            type="button"
            onClick={() => void reveal()}
            disabled={busy}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11.5px] font-medium text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Buka'}
          </button>
        ) : null}
      </div>
    )
  }

  // ── Sedang dilihat: overlay tanpa kontrol unduh ──
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Media sekali lihat"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="inline-flex items-center gap-2 text-[12px] text-white/80">
          {kind === 'video' ? <Video className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Sekali lihat
        </span>
        <button
          type="button"
          onClick={() => void close()}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-[12.5px] font-medium text-white"
        >
          Tutup
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-3 pb-6 select-none">
        {!src ? (
          <div className="flex items-center gap-2 text-[12px] text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : kind === 'video' ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            className="max-h-full max-w-full rounded-xl"
          />
        ) : (
          <img
            src={src}
            alt=""
            draggable={false}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        )}
      </div>

      <p className="pb-4 text-center text-[11px] text-white/50">
        Ditutup = tidak bisa dibuka lagi
      </p>
    </div>
  )
}
