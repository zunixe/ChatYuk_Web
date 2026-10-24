import { supabase } from '@/lib/supabase'
import { isDataUrl, isHttpUrl } from '@/lib/utils'
import { MAX_FILE_BYTES } from '@/lib/constants'
import { safeMediaUrl } from '@/lib/url-safety'
import type { Message } from '@/lib/types'

const BUCKET = 'chat-photos'
const KNOWN_PATH_PREFIXES = [
  'avatars/',
  'chat/',
  'voice/',
  'posts/',
  'timeline/',
  'story/',
  'stickers/',
  'room-icons/',
]

export function storagePublicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function resolveAvatar(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  if (isDataUrl(raw) || isHttpUrl(raw)) return safeMediaUrl(raw)
  if (KNOWN_PATH_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
    return storagePublicUrl(raw)
  }
  if (/\.(jpe?g|png|webp|gif)$/i.test(raw) && raw.includes('/')) {
    return storagePublicUrl(raw)
  }
  // Base64 legacy (tanpa prefix data:).
  if (raw.length > 80 && !raw.includes(' ')) {
    return `data:image/jpeg;base64,${raw}`
  }
  return null
}

/** Daftar stiker milik user (`stickers/<uid>/...`), terbaru dulu. */
export async function listMyStickers(uid: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(`stickers/${uid}`, {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error) return []
  return (data ?? [])
    .map((item) => item.name)
    .filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
    .map((name) => `stickers/${uid}/${name}`)
}

/** Path storage / URL http / data URL → URL yang aman ditampilkan. */
export function mediaUrl(path: string | null | undefined): string | null {
  const value = (path ?? '').trim()
  if (!value) return null
  // Skema berbahaya (javascript:, file:, data:text/html) ditolak di sini.
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) {
    return safeMediaUrl(value)
  }
  return safeMediaUrl(storagePublicUrl(value))
}

export function messageImageSrc(message: Message): string | null {
  const path = (message.image_path ?? '').trim()
  if (path) {
    if (isDataUrl(path) || isHttpUrl(path) || path.startsWith('blob:')) return safeMediaUrl(path)
    if (path.startsWith('chat/') || /\.(jpe?g|png|webp|gif)$/i.test(path)) {
      return storagePublicUrl(path)
    }
  }
  const inline = (message.image_data ?? '').trim()
  if (!inline) return null
  if (isDataUrl(inline) || isHttpUrl(inline) || inline.startsWith('blob:')) return safeMediaUrl(inline)
  if (inline.length > 80 && !inline.includes(' ')) {
    return `data:image/jpeg;base64,${inline}`
  }
  return null
}

async function compressImage(
  file: File,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/gif') return file

  let source: ImageBitmap | HTMLImageElement
  try {
    source = await createImageBitmap(file)
  } catch {
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      const url = URL.createObjectURL(file)
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Gambar tidak dapat dibaca'))
      }
      image.src = url
    })
  }

  const width = 'width' in source ? source.width : 0
  const height = 'height' in source ? source.height : 0
  if (!width || !height) return file

  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d')
  if (!context) return file
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, targetWidth, targetHeight)
  if ('close' in source) source.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  return blob ?? file
}

function uniqueName(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now()}_${random}.jpg`
}

function stamp(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function safeExt(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0 || dot === fileName.length - 1) return 'bin'
  const ext = fileName.slice(dot + 1).toLowerCase()
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
}

/** Upload dokumen chat (maks 50 MB, sama seperti mobile). */
export async function uploadChatFile(chatId: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Ukuran file maksimal 50 MB.')
  const path = `chat/${chatId}/${stamp()}_f.${safeExt(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

/** Upload video chat ke path .mp4 (mobile membaca mp4/mov dari chat/...). */
export async function uploadChatVideo(chatId: string, file: File): Promise<string> {
  const path = `chat/${chatId}/${stamp()}.mp4`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: 'video/mp4',
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function uploadChatVideoPoster(chatId: string, blob: Blob): Promise<string> {
  const path = `chat/${chatId}/${stamp()}_poster.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

/** Upload voice note (m4a agar kompatibel dengan pemutar mobile). */
export async function uploadChatVoice(chatId: string, blob: Blob): Promise<string> {
  const mime = blob.type || 'audio/webm'
  const ext = mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : 'webm'
  const path = `voice/${chatId}/${stamp()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: mime,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

/** Ambil frame video sebagai poster JPEG; null bila browser tidak bisa decode. */
export async function generateVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    const finish = (result: Blob | null) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      resolve(result)
    }
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(0.5, Math.max(0, (video.duration || 1) / 3))
      } catch {
        finish(null)
      }
    }
    video.onseeked = () => {
      try {
        const width = video.videoWidth
        const height = video.videoHeight
        if (!width || !height) return finish(null)
        const scale = Math.min(1, 640 / Math.max(width, height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))
        const context = canvas.getContext('2d')
        if (!context) return finish(null)
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.72)
      } catch {
        finish(null)
      }
    }
    video.onerror = () => finish(null)
    setTimeout(() => finish(null), 8000)
    video.src = url
  })
}

export async function uploadChatImage(chatId: string, file: File): Promise<string> {
  const blob = await compressImage(file, 1600, 0.82)
  const path = `chat/${chatId}/${uniqueName('')}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const blob = await compressImage(file, 512, 0.86)
  const path = `avatars/${uid}_${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

/**
 * URL untuk media view-once. Hanya dipanggil saat pengguna mengetuk
 * (jangan pernah saat render terkunci, agar aset tidak terunduh).
 */
export function mediaUrlForViewOnce(message: Message): string | null {
  const path = (message.image_path ?? message.image_data ?? '').trim()
  if (!path) return null
  // Path storage HARUS dicek lebih dulu: path chat/... sering >80 karakter dan
  // dulu salah dianggap base64 legacy (menghasilkan data: URL rusak).
  if (KNOWN_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return storagePublicUrl(path)
  }
  if (isDataUrl(path) || isHttpUrl(path) || path.startsWith('blob:')) return safeMediaUrl(path)
  if (/^[A-Za-z0-9+/=\s]+$/.test(path) && path.length > 80) {
    return `data:image/jpeg;base64,${path}`
  }
  return storagePublicUrl(path)
}
