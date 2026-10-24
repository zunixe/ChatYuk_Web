import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { sendPrivateMessage, updatePrivateLocation } from '@/lib/api/messages'
import { enqueueOutbox, isNetworkError } from '@/lib/outbox'
import { hasValidMagicBytes, looksLikeExecutable } from '@/lib/upload-validate'
import { MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_MS } from '@/lib/constants'
import { pickRecorderMime, probeVideoDuration } from '@/lib/media-capture'
import { errorMessage } from '@/lib/errors'
import {
  generateVideoPoster,
  uploadChatFile,
  uploadChatImage,
  uploadChatVideo,
  uploadChatVideoPoster,
  uploadChatVoice,
} from '@/lib/media'
import {
  addOptimisticMessage,
  failOptimisticMessage,
  replaceOptimisticMessage,
  touchChatCache,
  upsertMessageInCache,
} from '@/lib/query-cache'
import { messagePreview } from '@/lib/utils'
import type { Message } from '@/lib/types'

/** Buat id sementara + stempel waktu untuk pesan optimistis. */
function newOptimisticMeta(): { temp: string; now: string; negativeId: number } {
  return {
    temp: tempId(),
    now: new Date().toISOString(),
    negativeId: -Date.now(),
  }
}

function tempId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Pengiriman media: gambar, dokumen, video, voice note, lokasi. */
export function useMediaSend({
  chatId,
  myUid,
  senderName,
  senderGender,
  otherBlocked,
  replyTo,
  clearReply,
  onSent,
}: {
  chatId: string | undefined
  myUid: string | undefined
  senderName: string
  senderGender: string
  otherBlocked: boolean
  replyTo: Message | null
  clearReply: () => void
  onSent: () => void
}) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const liveTimerRef = useRef<number | undefined>(undefined)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recorderChunksRef = useRef<Blob[]>([])
  const recordStartRef = useRef(0)
  const recordTimerRef = useRef<number | undefined>(undefined)

  const [imageBusy, setImageBusy] = useState(false)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current)
      if (liveTimerRef.current) window.clearInterval(liveTimerRef.current)
    }
  }, [])

  /**
   * Validasi file: signature (magic bytes) + nama executable.
   * `file.type` bisa dipalsukan, jadi signature yang jadi acuan.
   */
  async function validateUpload(file: File): Promise<boolean> {
    if (looksLikeExecutable(file)) {
      toast.error('Jenis file ini tidak diizinkan.')
      return false
    }
    if (!(await hasValidMagicBytes(file))) {
      toast.error('File tidak dikenali — isinya bukan gambar/video/audio/dokumen yang valid.')
      return false
    }
    return true
  }

  function blockedGuard(): boolean {
    if (!otherBlocked) return false
    toast.error('Kamu memblokir pengguna ini. Buka info kontak untuk membuka blokir.')
    return true
  }

  async function sendAttachment(payload: {
    type: Message['type']
    text: string
    imagePath?: string
    voicePath?: string
    videoPoster?: string
    durationMs?: number
  }): Promise<Message | null> {
    if (!chatId || !myUid || otherBlocked) return null
    try {
      const server = await sendPrivateMessage({
        chatId,
        senderId: myUid,
        senderName,
        senderGender,
        text: payload.text,
        type: payload.type,
        imagePath: payload.imagePath,
        voicePath: payload.voicePath,
        videoPoster: payload.videoPoster,
        durationMs: payload.durationMs,
        repliedToId: replyTo?.id ?? null,
        repliedToText: replyTo ? messagePreview(replyTo) : null,
        repliedToSenderName: replyTo?.sender_name ?? null,
      })
      upsertMessageInCache(queryClient, chatId, server)
      clearReply()
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      onSent()
      return server
    } catch (error) {
      // Media sudah terunggah ke storage tetapi insert gagal → antrekan insert.
      if (isNetworkError(error) && chatId && myUid) {
        try {
          await enqueueOutbox({
            chatId,
            senderId: myUid,
            senderName,
            senderGender,
            text: payload.text,
            type: payload.type,
            imagePath: payload.imagePath,
            voicePath: payload.voicePath,
            videoPoster: payload.videoPoster,
            durationMs: payload.durationMs,
            repliedToId: replyTo?.id ?? null,
            repliedToText: replyTo ? messagePreview(replyTo) : null,
            repliedToSenderName: replyTo?.sender_name ?? null,
          })
          clearReply()
          toast.info('Tidak ada koneksi. Media akan dikirim otomatis.')
          return null
        } catch {
          // lanjut jalur error biasa
        }
      }
      toast.error(errorMessage(error))
      return null
    }
  }

  async function handleImageFile(event: ChangeEvent<HTMLInputElement>, caption = '') {
    const files = Array.from(event.target.files ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (files.length === 0 || !chatId || !myUid || imageBusy) return
    if (blockedGuard()) return

    // ALBUM: >1 foto sekaligus → satu `album_id` untuk semua (grid, seperti
    // Android). Maks 10 foto agar tidak membanjiri chat.
    if (files.length > 1) {
      await sendAlbum(files.slice(0, 10), caption)
      return
    }

    const file: File = files[0]
    const imageCaption: string = caption
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar.')
      return
    }
    if (!(await validateUpload(file))) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Ukuran gambar maksimal 8 MB.')
      return
    }

    const localUrl = URL.createObjectURL(file)
    const meta = newOptimisticMeta()
    const temp = meta.temp
    const now = meta.now
    const reply = replyTo
    const optimistic: Message = {
      id: meta.negativeId,
      chat_id: chatId,
      sender_id: myUid,
      sender_name: senderName,
      sender_gender: senderGender,
      text: imageCaption,
      type: 'image',
      image_data: localUrl,
      image_path: localUrl,
      replied_to_id: reply?.id ?? null,
      replied_to_text: reply ? messagePreview(reply) : null,
      replied_to_sender_name: reply?.sender_name ?? null,
      created_at: now,
      client_status: 'sending',
      temp_id: temp,
    }

    setImageBusy(true)
    addOptimisticMessage(queryClient, chatId, optimistic)
    touchChatCache(queryClient, myUid, chatId, caption || 'Foto', now)

    try {
      const path = await uploadChatImage(chatId, file)
      const server = await sendPrivateMessage({
        chatId,
        senderId: myUid,
        senderName,
        senderGender,
        text: caption,
        type: 'image',
        imagePath: path,
        repliedToId: reply?.id ?? null,
        repliedToText: reply ? messagePreview(reply) : null,
        repliedToSenderName: reply?.sender_name ?? null,
      })
      replaceOptimisticMessage(queryClient, chatId, temp, server)
      clearReply()
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      onSent()
    } catch (error) {
      failOptimisticMessage(queryClient, chatId, temp)
      toast.error(errorMessage(error))
    } finally {
      URL.revokeObjectURL(localUrl)
      setImageBusy(false)
    }
  }

  /**
   * Kirim beberapa foto sebagai ALBUM: semua pesan `image` memakai
   * `album_id` yang sama sehingga dirender jadi satu grid
   * (paritas `private_chat_chat2.dart` — album maks 10 foto).
   */
  async function sendAlbum(files: File[], caption: string) {
    if (!chatId || !myUid) return
    setImageBusy(true)
    const albumId = tempId()
    const now = new Date().toISOString()
    let first = true
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        if (!(await validateUpload(file))) continue
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error('Ukuran gambar maksimal 8 MB.')
          continue
        }
        const path = await uploadChatImage(chatId, file)
        const server = await sendPrivateMessage({
          chatId,
          senderId: myUid,
          senderName,
          senderGender,
          text: first ? caption : '',
          type: 'image',
          imagePath: path,
          albumId,
        })
        upsertMessageInCache(queryClient, chatId, server)
        first = false
      }
      touchChatCache(queryClient, myUid, chatId, 'Foto', now)
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      onSent()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setImageBusy(false)
    }
  }

  /** Kirim stiker (path storage `stickers/<uid>/...`) — kontrak Android. */
  async function sendSticker(path: string) {
    if (!chatId || !myUid || otherBlocked) return
    try {
      const server = await sendPrivateMessage({
        chatId,
        senderId: myUid,
        senderName,
        senderGender,
        text: '',
        type: 'sticker',
        imagePath: path,
      })
      upsertMessageInCache(queryClient, chatId, server)
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      onSent()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleDocFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (docRef.current) docRef.current.value = ''
    if (!file || !chatId) return
    if (blockedGuard()) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Ukuran file maksimal 50 MB.')
      return
    }
    if (!(await validateUpload(file))) return
    setMediaBusy(true)
    try {
      const path = await uploadChatFile(chatId, file)
      await sendAttachment({
        type: 'file',
        text: file.name,
        imagePath: path,
        durationMs: file.size,
      })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setMediaBusy(false)
    }
  }

  async function handleVideoFile(event: ChangeEvent<HTMLInputElement>, caption = '') {
    const file = event.target.files?.[0]
    if (videoRef.current) videoRef.current.value = ''
    if (!file || !chatId) return
    if (blockedGuard()) return
    if (!file.type.startsWith('video/')) {
      toast.error('Pilih berkas video.')
      return
    }
    if (!(await validateUpload(file))) return
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error('Ukuran video maksimal 15 MB.')
      return
    }
    setMediaBusy(true)
    try {
      // Durasi diperiksa SEBELUM upload agar tidak membuang kuota.
      const durationMs = await probeVideoDuration(file)
      if (durationMs > MAX_VIDEO_MS) {
        toast.error('Durasi video maksimal 60 detik.')
        return
      }
      const [path, poster] = await Promise.all([
        uploadChatVideo(chatId, file),
        generateVideoPoster(file).catch(() => null),
      ])
      let posterPath: string | undefined
      if (poster) posterPath = await uploadChatVideoPoster(chatId, poster)
      await sendAttachment({
        type: 'video',
        text: caption.trim(),
        imagePath: path,
        videoPoster: posterPath,
        durationMs,
      })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setMediaBusy(false)
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    if (!chatId || blockedGuard()) return
    const mime = pickRecorderMime()
    if (!navigator.mediaDevices?.getUserMedia || !mime) {
      toast.error(
        'Browser ini belum mendukung rekaman suara m4a. Gunakan Chrome/Safari terbaru.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      recorderRef.current = recorder
      recorderChunksRef.current = []
      recordStartRef.current = Date.now()
      setRecordSecs(0)
      setRecording(true)
      recordTimerRef.current = window.setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - recordStartRef.current) / 1000))
      }, 500)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current)
        recordTimerRef.current = undefined
        setRecording(false)
        const durationMs = Date.now() - recordStartRef.current
        const blob = new Blob(recorderChunksRef.current, { type: mime })
        recorderChunksRef.current = []
        if (!chatId || blob.size === 0 || durationMs < 600) return
        setMediaBusy(true)
        void uploadChatVoice(chatId, blob)
          .then((path) => sendAttachment({ type: 'voice', text: '', voicePath: path, durationMs }))
          .catch((error) => toast.error(errorMessage(error)))
          .finally(() => setMediaBusy(false))
      }
      recorder.start(250)
    } catch {
      toast.error('Tidak bisa mengakses mikrofon.')
    }
  }

  function sendLocation() {
    if (!chatId || blockedGuard()) return
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
        void sendAttachment({ type: 'location', text: payload })
      },
      () => toast.error('Gagal mengambil lokasi. Izinkan akses lokasi.'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  /**
   * Bagikan LOKASI LIVE di chat private: kirim sekali lalu perbarui koordinat
   * tiap 30 detik sampai `exp` lewat (paritas Android
   * `_startLiveLocationUpdates` pada room / chat private).
   */
  function startLiveLocation(minutes: number) {
    if (!chatId || blockedGuard()) return
    if (!navigator.geolocation) {
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
        void sendAttachment({ type: 'location', text: JSON.stringify(base) }).then((server) => {
          if (!server) return
          if (liveTimerRef.current) window.clearInterval(liveTimerRef.current)
          liveTimerRef.current = window.setInterval(() => {
            if (Date.now() > expiresAt.getTime()) {
              if (liveTimerRef.current) window.clearInterval(liveTimerRef.current)
              liveTimerRef.current = undefined
              return
            }
            navigator.geolocation.getCurrentPosition(
              (next) => {
                void updatePrivateLocation(
                  server.id,
                  JSON.stringify({
                    ...base,
                    lat: next.coords.latitude,
                    lng: next.coords.longitude,
                    acc: Math.round(next.coords.accuracy),
                  }),
                ).catch(() => {})
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

  return {
    fileRef,
    docRef,
    videoRef,
    imageBusy,
    mediaBusy,
    recording,
    recordSecs,
    handleImageFile,
    handleDocFile,
    handleVideoFile,
    sendSticker,
    toggleRecording,
    sendLocation,
    startLiveLocation,
    tempId,
  }
}
