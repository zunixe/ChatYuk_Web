import {
  LogOut,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LogoMark } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChats, unreadTotal } from '@/hooks/useChatData'
import { useChatListRealtime } from '@/hooks/useChatRealtime'
import { useOnlineStatus, usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat'
import { resolveAvatar } from '@/lib/media'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

// Menu utama — sama dengan aplikasi Android: Online & Chat.
// Pengaturan tetap ada di menu profil (desktop) dan header Chat (mobile).
const NAV = [
  { to: '/new-chat', label: 'Online', icon: Users },
  { to: '/chats', label: 'Chat', icon: MessageCircle },
]

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const resolvedTheme = useUiStore((state) => state.resolvedTheme)
  const setTheme = useUiStore((state) => state.setTheme)
  const online = useOnlineStatus()

  usePresenceHeartbeat(profile?.id, profile?.status)
  useChatListRealtime(profile?.id)
  const chatsQuery = useChats(profile?.id)
  const chats = chatsQuery.data ?? []
  const unread = profile ? unreadTotal(chats, profile.id) : 0
  const selfAvatar = resolveAvatar(profile?.avatar)
  const displayName = profile?.nickname || user?.email || 'Pengguna'

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal keluar.')
    }
  }

  return (
    <div className="h-dvh overflow-hidden bg-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-border bg-surface/90 px-3 py-5 backdrop-blur md:flex">
        <Link
          to="/chats"
          className="mb-6 rounded-2xl outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="ChatYuk"
        >
          <LogoMark className="h-11 w-11" />
        </Link>

        <nav className="flex w-full flex-col items-center gap-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition',
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'hover:bg-panel hover:text-text',
                )
              }
            >
              <item.icon className="h-[21px] w-[21px]" strokeWidth={2} />
              {item.to === '/chats' && unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3">
          <NavLink
            to="/settings"
            title="Pengaturan"
            aria-label="Pengaturan"
            className={({ isActive }) =>
              cn(
                'flex h-11 w-11 items-center justify-center rounded-2xl text-muted transition',
                isActive ? 'bg-primary-soft text-primary' : 'hover:bg-panel hover:text-text',
              )
            }
          >
            <Settings className="h-[21px] w-[21px]" strokeWidth={2} />
          </NavLink>
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text"
            aria-label="Ganti tema"
            title="Ganti tema"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full outline-none ring-offset-2 ring-offset-surface transition focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Menu profil"
              >
                <Avatar src={selfAvatar} name={displayName} size={40} online={online} gender={profile?.gender} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-60">
              <DropdownMenuLabel className="px-2.5 py-2">
                <div className="truncate text-[13px] font-semibold text-text">{displayName}</div>
                <div className="truncate text-[11px] font-normal text-muted">
                  {user?.email ?? 'ChatYuk Web'}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                  Pengaturan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Mode {resolvedTheme === 'dark' ? 'terang' : 'gelap'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void handleSignOut()}
                className="text-danger data-[highlighted]:bg-danger/8 data-[highlighted]:text-danger"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-col md:pl-[76px]">
        {!online ? (
          <div className="flex items-center justify-center gap-2 bg-amber-500/12 px-4 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            <WifiOff className="h-3.5 w-3.5" />
            Kamu sedang offline. Pesan baru akan dimuat saat koneksi kembali.
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-hidden pb-[68px] md:pb-0">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
                  isActive ? 'text-primary' : 'text-muted',
                )
              }
            >
              <span className="relative">
                <item.icon className="h-[21px] w-[21px]" />
                {item.to === '/chats' && unread > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
