import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sendRoomMedia, updateRoomLocation } from '@/lib/api/groups'
import { hasValidMagicBytes, looksLikeExecutable } from '@/lib/upload-validate'
import { MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_MS } from '@/lib/constants'
import { errorMessage } from '@/lib/errors'
import { pickRecorderMime, probeVideoDuration } from '@/lib/media-capture'
import {
  generateVideoPoster,
  uploadChatFile,
  uploadChatImage,
  uploadChatVideo,
  uploadChatVideoPoster,
  uploadChatVoice,
} from '@/lib/media'

/**
 * Kirim media ke GRUP (tabel `messages`, `room_id`).
 *
 * Path storage tetap `chat/<roomId>/...` (sama seperti Android) sehingga
 * media yang dikirim dari web terbaca di HP dan sebaliknya.
 *
 * Catatan: berbeda dari chat private, tidak ada outbox offline untuk media
 * grup (fase ini) — kegagalan jaringan ditampilkan sebagai error.
 */
export function useGroupMediaSend({
  roomId,
  myUid,
  senderName,
  senderGender,
  onSent,
}: {
  roomId: string | undefined
  myUid: string | undefined
  senderName: string
  senderGender: string | null
  onSent: () => void
}) {
  const queryClient = useQueryClient()
  const imageRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startRef = useRef(0)
  const timerRef = useRef<number | undefined>(undefined)
  const liveTimerRef = useRef<number | undefined>(undefined)

  const [imageBusy, setImageBusy] = useState(false)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (liveTimerRef.current) window.clearInterval(liveTimerRef.current)
    }
  }, [])

  /**
   * Segmen path storage untuk grup WAJIB `room_<roomId>`.
   * Policy `storage_object_owner_ok` menolak `chat/<roomId>/...`, dan
   * Android memakai nilai yang sama (`photoUploadChatId => 'room_${room.id}'`).
   */
  const storageKey = roomId ? `room_${roomId}` : ''

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['groups', 'messages', roomId] })
    void queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] })
    onSent()
  }

  async function validate(file: File): Promise<boolean> {
    if (looksLikeExecutable(file)) {
      toast.error('Jenis file ini tidak diizinkan.')
      return false
    }
    if (!(await hasValidMagicBytes(file))) {
      toast.error('File tidak dikenali — isinya bukan media/dokumen valid.')
      return false
    }
    return true
  }

  async function send(input: {
    type: 'image' | 'video' | 'file' | 'voice' | 'location' | 'sticker'
    text: string
    imagePath?: string
    voicePath?: string
    videoPoster?: string
    durationMs?: number
  }): Promise<number | null> {
    if (!roomId || !myUid) return null
    try {
      const id = await sendRoomMedia({
        roomId,
        senderId: myUid,
        senderName,
        senderGender,
        type: input.type,
        text: input.text,
        imagePath: input.imagePath,
        voicePath: input.voicePath,
        videoPoster: input.videoPoster,
        durationMs: input.durationMs,
      })
      refresh()
      return id
    } catch (error) {
      toast.error(errorMessage(error))
      return null
    }
  }

  /**
   * Bagikan lokasi LIVE: kirim sekali lalu perbarui koordinat tiap 30 detik
   * sampai `expiresAt` lewat (sama seperti Android
   * `_startLiveLocationUpdates`). Event pembaruan tetap `UPDATE messages.text`
   * sehingga penerima di HP ikut bergerak.
   */
  function startLiveLocation(minutes: number) {
    if (!roomId || !navigator.geolocation) {
      toast.error('Perangkat tidak mendukung lokasi.')
      return
    }
    const expiresAt = new Date(Date.now() + minutes * 60_000)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const base = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Lokasi saya',
          caption: '',
          live: true,
          exp: expiresAt.toISOString(),
          acc: Math.round(position.coords.accuracy),
        }
        void send({ type: 'location', text: JSON.stringify(base) }).then((messageId) => {
          if (messageId == null) return
          if (liveTimerRef.current) window.clearInterval(liveTimerRef.current)
          liveTimerRef.current = window.setInterval(() => {
            if (Date.now() > expiresAt.getTime()) {
              if (liveTimerRef.current) window.clearInterval(liveTimerRef.current)
              liveTimerRef.current = undefined
              return
            }
            navigator.geolocation.getCurrentPosition(
              (next) => {
                void updateRoomLocation(
                  messageId,
                  JSON.stringify({
                    ...base,
                    lat: next.coords.latitude,
                    lng: next.coords.longitude,
                    acc: Math.round(next.coords.accuracy),
                  }),
                )
              },
              () => {},
              { enableHighAccuracy: true, timeout: 12000 },
            )
          }, 30_000)
        })
      },
      () => toast.error('Gagal mengambil lokasi. Izinkan akses lokasi.'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (imageRef.current) imageRef.current.value = ''
    if (!file || !roomId || imageBusy) return
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar.')
      return
    }
    if (!(await validate(file))) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Ukuran gambar maksimal 8 MB.')
      return
    }
    setImageBusy(true)
    try {
      const path = await uploadChatImage(storageKey, file)
      await send({ type: 'image', text: '', imagePath: path })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setImageBusy(false)
    }
  }

  async function handleDoc(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (docRef.current) docRef.current.value = ''
    if (!file || !roomId) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Ukuran file maksimal 50 MB.')
      return
    }
    if (!(await validate(file))) return
    setMediaBusy(true)
    try {
      const path = await uploadChatFile(storageKey, file)
      await send({ type: 'file', text: file.name, imagePath: path, durationMs: file.size })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setMediaBusy(false)
    }
  }

  async function handleVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (videoRef.current) videoRef.current.value = ''
    if (!file || !roomId) return
    if (!file.type.startsWith('video/')) {
      toast.error('Pilih berkas video.')
      return
    }
    if (!(await validate(file))) return
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error('Ukuran video maksimal 15 MB.')
      return
    }
    setMediaBusy(true)
    try {
      const durationMs = await probeVideoDuration(file)
      if (durationMs > MAX_VIDEO_MS) {
        toast.error('Durasi video maksimal 60 detik.')
        return
      }
      const [path, poster] = await Promise.all([
        uploadChatVideo(storageKey, file),
        generateVideoPoster(file).catch(() => null),
      ])
      let posterPath: string | undefined
      if (poster) posterPath = await uploadChatVideoPoster(storageKey, poster)
      await send({ type: 'video', text: '', imagePath: path, videoPoster: posterPath, durationMs })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setMediaBusy(false)
    }
  }

  function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    if (!roomId) return
    const mime = pickRecorderMime()
    if (!navigator.mediaDevices?.getUserMedia || !mime) {
      toast.error('Browser ini belum mendukung rekaman suara m4a. Gunakan Chrome/Safari terbaru.')
      return
    }
    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream, { mimeType: mime })
        recorderRef.current = recorder
        chunksRef.current = []
        startRef.current = Date.now()
        setRecordSecs(0)
        setRecording(true)
        timerRef.current = window.setInterval(() => {
          setRecordSecs(Math.floor((Date.now() - startRef.current) / 1000))
        }, 500)
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          if (timerRef.current) window.clearInterval(timerRef.current)
          timerRef.current = undefined
          setRecording(false)
          const durationMs = Date.now() - startRef.current
          const blob = new Blob(chunksRef.current, { type: mime })
          chunksRef.current = []
          if (blob.size === 0 || durationMs < 600) return
          setMediaBusy(true)
          void uploadChatVoice(storageKey, blob)
            .then((path) => send({ type: 'voice', text: '', voicePath: path, durationMs }))
            .catch((error) => toast.error(errorMessage(error)))
            .finally(() => setMediaBusy(false))
        }
        recorder.start(250)
      })
      .catch(() => toast.error('Tidak bisa mengakses mikrofon.'))
  }

  /** Kirim stiker ke grup (`type='sticker'`, `image_data` = path). */
  function sendSticker(path: string) {
    void send({ type: 'sticker', text: '', imagePath: path })
  }

  function sendLocation() {
    if (!roomId) return
    if (!navigator.geolocation) {
      toast.error('Perangkat tidak mendukung lokasi.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const payload = JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Lokasi saya',
          caption: '',
          accuracyM: Math.round(position.coords.accuracy),
        })
        void send({ type: 'location', text: payload })
      },
      () => toast.error('Gagal mengambil lokasi. Izinkan akses lokasi.'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  return {
    imageRef,
    docRef,
    videoRef,
    imageBusy,
    mediaBusy,
    recording,
    recordSecs,
    handleImage,
    handleDoc,
    handleVideo,
    toggleRecording,
    sendLocation,
    sendSticker,
    startLiveLocation,
  }
}
