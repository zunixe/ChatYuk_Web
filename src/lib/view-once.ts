/**
 * Kontrak view-once, sama dengan aplikasi mobile:
 * - `view_once`        : belum dilihat (aset TIDAK boleh di-resolve)
 * - `view_once_expired`: sudah dilihat → terkunci permanen
 * - `video_once` / `video_once_expired` analog untuk video
 *
 * Mobile menandai pemakaian dengan UPDATE `type` lalu broadcast
 * `view_once_seen`. Web mengikuti kontrak yang sama agar pengirim di HP
 * langsung melihat kartunya terkunci.
 */

export type ViewOnceKind = 'photo' | 'video'

export function isViewOnceType(type: string | null | undefined): boolean {
  return type === 'view_once' || type === 'video_once'
}

export function isViewOnceExpiredType(type: string | null | undefined): boolean {
  return type === 'view_once_expired' || type === 'video_once_expired'
}

export function isViewOnceFamily(type: string | null | undefined): boolean {
  return isViewOnceType(type) || isViewOnceExpiredType(type)
}

export function viewOnceKind(type: string | null | undefined): ViewOnceKind {
  return type === 'video_once' || type === 'video_once_expired' ? 'video' : 'photo'
}

export function expiredTypeFor(kind: ViewOnceKind): string {
  return kind === 'video' ? 'video_once_expired' : 'view_once_expired'
}

/**
 * Topik broadcast penanda "sudah dilihat" — HARUS sama dengan mobile
 * (`chatStreamTopic('private_<chatId>')`).
 */
export function viewOnceSeenTopic(chatId: string): string {
  // mobile: chatStreamTopic('private_<chatId>') => 'msg-private_<chatId>'
  return `msg-private_${chatId}`
}

export type ViewOnceState = 'locked' | 'revealed' | 'expired'

export function initialViewOnceState(type: string | null | undefined): ViewOnceState {
  return isViewOnceExpiredType(type) ? 'expired' : 'locked'
}
