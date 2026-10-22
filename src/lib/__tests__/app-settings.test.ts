import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error('boom') }),
        }),
      }),
    }),
  },
}))

describe('fetchAppSettings', () => {
  it('mengembalikan default aman saat Supabase gagal', async () => {
    const { fetchAppSettings } = await import('@/lib/api/app-settings')
    const result = await fetchAppSettings()
    expect(result.requireRegistration).toBe(false)
    expect(result.callAnonEnabled).toBe(false)
  })
})
