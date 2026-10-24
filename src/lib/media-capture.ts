/** Utilitas capture media yang dipakai chat private & grup. */

export function probeVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const ms = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0
      URL.revokeObjectURL(url)
      resolve(ms)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}

/**
 * Rekaman voice HARUS m4a: mobile hanya mengenali `voice/*.m4a`
 * (`StoragePhotoService.isVoicePath`).
 */
export const VOICE_MIME = 'audio/mp4'

export function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return MediaRecorder.isTypeSupported(VOICE_MIME) ? VOICE_MIME : ''
}
