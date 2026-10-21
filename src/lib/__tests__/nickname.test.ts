import { describe, expect, it } from 'vitest'
import {
  isBannedNickname,
  isValidEmail,
  isValidNickname,
  normalizeNicknameForBan,
} from '@/lib/nickname'

// Mirrors ChatYuk mobile test/banned_nickname_test.dart
describe('isBannedNickname', () => {
  it('blocks zaini/hafid variants', () => {
    for (const name of [
      'ZAINI',
      'hafid',
      'Zaini Hafid',
      'Hafid Zaini',
      'ZAINIHAFID',
      'zaini-hafid',
      'zaini_hafid',
      'ZaInI',
      'XXhafidXX',
      'ZainiGanteng123',
    ]) {
      expect(isBannedNickname(name), name).toBe(true)
    }
  })

  it('allows ordinary names', () => {
    for (const name of ['Zain', 'Hafi', 'Ani', 'Budi', 'Sari123', '']) {
      expect(isBannedNickname(name), name).toBe(false)
    }
  })

  it('normalizes spaces, underscores and dashes', () => {
    expect(normalizeNicknameForBan('  Zaini-Hafid ')).toBe('zainihafid')
    expect(normalizeNicknameForBan('ZAINI_HAFID')).toBe('zainihafid')
  })
})

describe('isValidNickname', () => {
  it('accepts 3-20 letters, numbers, spaces, underscore and dash', () => {
    for (const name of ['Raka', 'Sari 123', 'budi_s', 'ani-2', 'José']) {
      expect(isValidNickname(name), name).toBe(true)
    }
  })

  it('rejects too short, too long and symbols', () => {
    expect(isValidNickname('ab')).toBe(false)
    expect(isValidNickname('   ')).toBe(false)
    expect(isValidNickname('a'.repeat(21))).toBe(false)
    expect(isValidNickname('raka!')).toBe(false)
    expect(isValidNickname('raka@mail')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('accepts normal emails and rejects malformed ones', () => {
    expect(isValidEmail('raka.web@chatyuk.test')).toBe(true)
    expect(isValidEmail(' a+b@c.co ')).toBe(true)
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
  })
})
