import { create } from 'zustand'

type ThemeMode = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  toggle: () => void
  setMode: (mode: ThemeMode) => void
}

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem('ff-theme-mode')
  if (stored === 'light' || stored === 'dark') return stored
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function applyMode(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
  localStorage.setItem('ff-theme-mode', mode)
}

// Apply on load (before React renders)
const initialMode = getInitialMode()
applyMode(initialMode)

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  toggle: () =>
    set((state) => {
      const next = state.mode === 'light' ? 'dark' : 'light'
      applyMode(next)
      return { mode: next }
    }),
  setMode: (mode) => {
    applyMode(mode)
    set({ mode })
  },
}))
