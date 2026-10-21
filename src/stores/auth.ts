import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { fetchMyProfile } from '@/lib/api/profiles'
import { clearLocalData } from '@/lib/db'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthState {
  initialized: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  profileLoading: boolean
  profileError: string | null
  refreshProfile: () => Promise<Profile | null>
  signOut: () => Promise<void>
}

let started = false
let profileRequest = 0

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  user: null,
  profile: null,
  profileLoading: true,
  profileError: null,

  refreshProfile: async () => {
    const requestId = ++profileRequest
    if (!get().session) {
      set({ profile: null, profileLoading: false, profileError: null })
      return null
    }
    set({ profileLoading: true })
    try {
      const profile = await fetchMyProfile()
      if (requestId !== profileRequest) return profile
      set({ profile, profileError: null, profileLoading: false })
      return profile
    } catch (error) {
      if (requestId !== profileRequest) return null
      set({ profileError: errorMessage(error), profileLoading: false })
      return null
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    await clearLocalData()
    profileRequest += 1
    set({
      session: null,
      user: null,
      profile: null,
      profileLoading: false,
      profileError: null,
    })
  },
}))

function applySession(session: Session | null): void {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    profile: session ? useAuthStore.getState().profile : null,
    profileLoading: session ? useAuthStore.getState().profile === null : false,
    profileError: null,
  })
}

export function bootstrapAuth(): void {
  if (started) return
  started = true

  supabase.auth.onAuthStateChange((event, session) => {
    applySession(session)
    if (session) {
      if (event !== 'TOKEN_REFRESHED') {
        void useAuthStore.getState().refreshProfile()
      }
    } else {
      profileRequest += 1
      useAuthStore.setState({ profile: null, profileLoading: false, profileError: null })
    }
    useAuthStore.setState({ initialized: true })
  })

  supabase.auth
    .getSession()
    .then(({ data }) => {
      applySession(data.session)
      if (data.session) {
        void useAuthStore.getState().refreshProfile()
      } else {
        useAuthStore.setState({ profileLoading: false })
      }
    })
    .catch((error) => {
      useAuthStore.setState({
        profileError: errorMessage(error),
        profileLoading: false,
        initialized: true,
      })
    })
    .finally(() => {
      useAuthStore.setState({ initialized: true })
    })
}

export function needsOnboarding(profile: Profile | null): boolean {
  if (!profile) return true
  if (!profile.nickname || !profile.nickname.trim()) return true
  return profile.needs_onboarding === true
}
