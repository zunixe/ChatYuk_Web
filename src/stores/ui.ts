import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'chatyuk-theme'

function storedTheme(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode
}

interface UiState {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (mode: ThemeMode) => void
  setResolvedTheme: (theme: 'light' | 'dark') => void
}

export const useUiStore = create<UiState>((set) => ({
  theme: storedTheme(),
  resolvedTheme: resolve(storedTheme()),
  setTheme: (mode) => {
    localStorage.setItem(THEME_KEY, mode)
    set({ theme: mode, resolvedTheme: resolve(mode) })
  },
  setResolvedTheme: (theme) => set({ resolvedTheme: theme }),
}))

function applyDocumentTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function initTheme(): void {
  const state = useUiStore.getState()
  applyDocumentTheme(state.resolvedTheme)
  useUiStore.subscribe((next, previous) => {
    if (next.resolvedTheme !== previous.resolvedTheme) {
      applyDocumentTheme(next.resolvedTheme)
    }
  })

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (useUiStore.getState().theme !== 'system') return
    const resolved = systemPrefersDark() ? 'dark' : 'light'
    useUiStore.getState().setResolvedTheme(resolved)
  }
  media.addEventListener('change', onChange)
}
