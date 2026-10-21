// Ported from ChatYuk mobile lib/utils.dart so web and Android share rules.

export const NICKNAME_MIN = 3
export const NICKNAME_MAX = 20

/** Lowercase + remove spaces/underscore/dash so ZAINI-HAFID == ZAINIHAFID. */
export function normalizeNicknameForBan(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

/** True when the nickname contains a blocked word (substring, case-insensitive). */
export function isBannedNickname(nickname: string): boolean {
  const flat = normalizeNicknameForBan(nickname)
  if (!flat) return false
  return flat.includes('zaini') || flat.includes('hafid')
}

/** Letters (Unicode), numbers, space, underscore, dash; 3-20 chars. */
export function isValidNickname(nickname: string): boolean {
  const trimmed = nickname.trim()
  if (trimmed.length < NICKNAME_MIN || trimmed.length > NICKNAME_MAX) return false
  return /^[\p{L}\p{N} _-]+$/u.test(trimmed)
}

export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())
}
