import { describe, expect, it } from 'vitest'
import {
  activeMentionToken,
  filterMentionCandidates,
  mentionsFrom,
  splitMentions,
  type Mention,
} from '@/lib/mention'

const people: Mention[] = [
  { uid: 'u1', name: 'Budi' },
  { uid: 'u2', name: 'Budi Santoso' },
  { uid: 'u3', name: 'Ani' },
]

describe('activeMentionToken', () => {
  it('mendeteksi token di awal teks', () => {
    expect(activeMentionToken('@bud', 4)).toEqual({ start: 0, query: 'bud' })
  })

  it('mendeteksi token setelah spasi', () => {
    expect(activeMentionToken('halo @an', 8)).toEqual({ start: 5, query: 'an' })
  })

  it('null bila bukan di dalam token', () => {
    expect(activeMentionToken('halo dunia', 10)).toBeNull()
  })

  it('berhenti pada spasi (panel tertutup)', () => {
    expect(activeMentionToken('@budi ', 6)).toBeNull()
  })

  it('null bila @ menempel pada huruf (email)', () => {
    expect(activeMentionToken('a@b', 3)).toBeNull()
  })
})

describe('filterMentionCandidates', () => {
  it('prioritas prefix nama', () => {
    expect(filterMentionCandidates(people, 'bud').map((p) => p.uid)).toEqual(['u1', 'u2'])
  })

  it('cocok prefix kata', () => {
    expect(filterMentionCandidates(people, 'sant').map((p) => p.uid)).toEqual(['u2'])
  })

  it('query kosong mengembalikan sejumlah limit', () => {
    expect(filterMentionCandidates(people, '', 2)).toHaveLength(2)
  })
})

describe('splitMentions', () => {
  it('menyorot nama terpanjang lebih dulu', () => {
    const segments = splitMentions('hai @Budi Santoso!', people)
    expect(segments.some((s) => s.kind === 'mention' && s.text === '@Budi Santoso')).toBe(true)
  })

  it('@all hanya disorot bila allowAll', () => {
    expect(splitMentions('@all hadir', [], false)).toEqual([{ kind: 'text', text: '@all hadir' }])
    expect(splitMentions('@all hadir', [], true).some((s) => s.kind === 'mention')).toBe(true)
  })

  it('tanpa @ mengembalikan satu segmen teks', () => {
    expect(splitMentions('halo', people)).toEqual([{ kind: 'text', text: 'halo' }])
  })
})

describe('mentionsFrom', () => {
  it('menyaring entri tanpa uid', () => {
    expect(mentionsFrom([{ uid: 'u1', name: 'A' }, { name: 'B' }, null])).toEqual([
      { uid: 'u1', name: 'A' },
    ])
  })
})
