import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { FullPageSpinner } from '@/components/ui/feedback'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ChatPage } from '@/features/chat/ChatPage'
import { ChatsLayout, ChatsEmptyState } from '@/features/chats/ChatsLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { WelcomePage } from '@/features/auth/WelcomePage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { NewChatPage } from '@/features/chats/NewChatPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { StoriesPage } from '@/features/stories/StoriesPage'
import { PointsPage } from '@/features/points/PointsPage'
import { TimelinePage } from '@/features/timeline/TimelinePage'
import { DonatePage } from '@/features/donate/DonatePage'
import { ContactPage } from '@/features/contact/ContactPage'
import { NearbyPage } from '@/features/nearby/NearbyPage'
import { GroupRoomPage } from '@/features/groups/GroupRoomPage'
import { GroupMediaPage } from '@/features/groups/GroupMediaPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { needsOnboarding, useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import { WifiOff } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

function ConnectionError() {
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const signOut = useAuthStore((state) => state.signOut)
  const profileError = useAuthStore((state) => state.profileError)
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <WifiOff className="h-6 w-6" />
      </div>
      <div>
        <h1 className="font-display text-lg font-semibold text-text">Tidak dapat memuat profil</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">{profileError ?? 'Periksa koneksi lalu coba lagi.'}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => void refreshProfile()}>Coba lagi</Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          Keluar
        </Button>
      </div>
    </div>
  )
}

function PublicOnly({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((state) => state.initialized)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)
  const profileLoading = useAuthStore((state) => state.profileLoading)

  if (!initialized) return <FullPageSpinner />
  if (session) {
    if (profileLoading) return <FullPageSpinner label="Menyiapkan profil…" />
    return <Navigate to={needsOnboarding(profile) ? '/onboarding' : '/new-chat'} replace />
  }
  return <>{children}</>
}

function OnboardingGate() {
  const initialized = useAuthStore((state) => state.initialized)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)
  const profileLoading = useAuthStore((state) => state.profileLoading)
  const profileError = useAuthStore((state) => state.profileError)

  if (!initialized) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (profileError) return <ConnectionError />
  if (profileLoading) return <FullPageSpinner label="Menyiapkan profil…" />
  if (!needsOnboarding(profile)) return <Navigate to="/new-chat" replace />
  return <OnboardingPage />
}

function ProtectedLayout() {
  const initialized = useAuthStore((state) => state.initialized)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)
  const profileLoading = useAuthStore((state) => state.profileLoading)
  const profileError = useAuthStore((state) => state.profileError)

  if (!initialized) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (profileError) return <ConnectionError />
  if (profileLoading) return <FullPageSpinner label="Menyiapkan profil…" />
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme)

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <WelcomePage />
                </PublicOnly>
              }
            />
            <Route
              path="/login/email"
              element={
                <PublicOnly>
                  <LoginPage />
                </PublicOnly>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnly>
                  <RegisterPage />
                </PublicOnly>
              }
            />
            <Route path="/onboarding" element={<OnboardingGate />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/chats" element={<ChatsLayout />}>
                <Route index element={<ChatsEmptyState />} />
                <Route path=":chatId" element={<ChatPage />} />
              </Route>
              <Route path="/new-chat" element={<NewChatPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/points" element={<PointsPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/nearby" element={<NearbyPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:groupId" element={<GroupRoomPage />} />
              <Route path="/groups/:groupId/media" element={<GroupMediaPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/chats" replace />} />
          </Routes>
          <Toaster
            theme={resolvedTheme}
            position="top-center"
            richColors
            closeButton
            toastOptions={{ duration: 3200 }}
          />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
