import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Self-hosted fonts — imported here (not index.css) so Vite rebases the woff2
   URLs; Tailwind's postcss-import would inline them without rewriting paths. */
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import './index.css'
import App from './App.tsx'

/**
 * After a redeploy the old hashed chunk files are gone and lazy imports 404.
 * Reload once to pick up the new build; the sessionStorage timestamp guards
 * against reload loops when the chunk is genuinely unavailable.
 */
const PRELOAD_ERROR_RELOAD_KEY = 'ff:preload-error-reloaded-at'
const PRELOAD_ERROR_RELOAD_WINDOW_MS = 30_000

window.addEventListener('vite:preloadError', (event) => {
  let lastReloadAt = 0
  try {
    lastReloadAt = Number(sessionStorage.getItem(PRELOAD_ERROR_RELOAD_KEY)) || 0
  } catch {
    // sessionStorage unavailable — fall through to the guard below.
  }
  if (Date.now() - lastReloadAt < PRELOAD_ERROR_RELOAD_WINDOW_MS) return
  try {
    sessionStorage.setItem(PRELOAD_ERROR_RELOAD_KEY, String(Date.now()))
  } catch {
    // Without storage we cannot guard against a reload loop — let the error surface.
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
