import { describe, expect, it } from 'vitest'
import {
  expiredTypeFor,
  initialViewOnceState,
  isViewOnceExpiredType,
  isViewOnceFamily,
  isViewOnceType,
  viewOnceKind,
  viewOnceSeenTopic,
} from '@/lib/view-once'

describe('view-once type predicates', () => {
  it('recognises locked view-once types', () => {
    expect(isViewOnceType('view_once')).toBe(true)
    expect(isViewOnceType('video_once')).toBe(true)
    expect(isViewOnceType('image')).toBe(false)
    expect(isViewOnceType('view_once_expired')).toBe(false)
    expect(isViewOnceType(null)).toBe(false)
  })

  it('recognises expired types', () => {
    expect(isViewOnceExpiredType('view_once_expired')).toBe(true)
    expect(isViewOnceExpiredType('video_once_expired')).toBe(true)
    expect(isViewOnceExpiredType('view_once')).toBe(false)
    expect(isViewOnceExpiredType(undefined)).toBe(false)
  })

  it('detects the whole family', () => {
    for (const type of ['view_once', 'video_once', 'view_once_expired', 'video_once_expired']) {
      expect(isViewOnceFamily(type), type).toBe(true)
    }
    expect(isViewOnceFamily('image')).toBe(false)
    expect(isViewOnceFamily('text')).toBe(false)
  })
})

describe('view-once kind mapping', () => {
  it('maps video types to video, everything else to photo', () => {
    expect(viewOnceKind('video_once')).toBe('video')
    expect(viewOnceKind('video_once_expired')).toBe('video')
    expect(viewOnceKind('view_once')).toBe('photo')
    expect(viewOnceKind('view_once_expired')).toBe('photo')
  })

  it('returns the expired type mobile expects', () => {
    expect(expiredTypeFor('photo')).toBe('view_once_expired')
    expect(expiredTypeFor('video')).toBe('video_once_expired')
  })
})

describe('view-once initial state', () => {
  it('locks unseen media and locks expired media permanently', () => {
    expect(initialViewOnceState('view_once')).toBe('locked')
    expect(initialViewOnceState('video_once')).toBe('locked')
    expect(initialViewOnceState('view_once_expired')).toBe('expired')
    expect(initialViewOnceState('video_once_expired')).toBe('expired')
  })
})

describe('viewOnceSeenTopic', () => {
  it('matches the mobile topic format (msg-private_<chatId>)', () => {
    expect(viewOnceSeenTopic('a_b')).toBe('msg-private_a_b')
  })
})
