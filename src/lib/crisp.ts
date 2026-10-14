/**
 * Crisp support chat (https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/).
 * Mirrors the legacy admin loader (`admin/js/services/crisp.js`): load the SDK once, set the
 * user identity and session data, keep Crisp's own floating launcher hidden, and open the chat
 * only from the top-bar button. Every call is best-effort: a blocked or failed SDK never throws.
 */
import type { SupportChatConfig } from '@/schemas/apiBoundaries'

const CRISP_SCRIPT_SRC = 'https://client.crisp.chat/l.js'
/** Fallback for when `session:loaded` fires before our handler is registered. */
const HIDE_LAUNCHER_FALLBACK_MS = 2500
/**
 * Email of the user whose identity this browser last gave Crisp. Crisp keeps its session in a
 * cookie across page loads, so a different user signing in must reset it to avoid inheriting
 * the previous user's conversation.
 */
export const CRISP_IDENTITY_STORAGE_KEY = 'ff-crisp-identity'

type CrispCommand = unknown[]

declare global {
  interface Window {
    /** A command queue before the SDK loads; the SDK object (with `is`) afterwards. */
    $crisp?: CrispCommand[] & { is?: (state: string) => boolean }
    CRISP_WEBSITE_ID?: string
  }
}

/** Email applied during this page load; undefined until the first load. */
let appliedEmail: string | undefined

function push(command: CrispCommand) {
  try {
    window.$crisp?.push(command)
  } catch {
    // Crisp failures must never break the app.
  }
}

/** Hide Crisp's floating launcher unless the user has the chat open. */
function hideLauncher() {
  try {
    if (window.$crisp?.is?.('chat:opened')) return
  } catch {
    // Fall through: hiding is still the safe default.
  }
  push(['do', 'chat:hide'])
}

function readStoredEmail(): string | null {
  try {
    return window.localStorage.getItem(CRISP_IDENTITY_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Load the Crisp SDK (first call only) and apply the user's identity. A user different from the
 * one this browser last identified (in this page or an earlier one) resets the Crisp session.
 */
export function loadCrisp(config: SupportChatConfig) {
  try {
    if (!window.$crisp) {
      window.$crisp = []
      window.CRISP_WEBSITE_ID = config.websiteId
      const script = document.createElement('script')
      script.src = CRISP_SCRIPT_SRC
      script.async = true
      script.crossOrigin = 'anonymous'
      script.onerror = () => {}
      document.head.appendChild(script)
      push(['on', 'session:loaded', hideLauncher])
      // The chat is closed here by definition; `is('chat:opened')` may not have updated yet.
      push(['on', 'chat:closed', () => push(['do', 'chat:hide'])])
      window.setTimeout(hideLauncher, HIDE_LAUNCHER_FALLBACK_MS)
    }

    const previousEmail = appliedEmail ?? readStoredEmail()
    if (previousEmail !== null && previousEmail !== config.email) push(['do', 'session:reset'])
    appliedEmail = config.email
    try {
      window.localStorage.setItem(CRISP_IDENTITY_STORAGE_KEY, config.email)
    } catch {
      // Storage may be unavailable (private mode); only cross-load reset detection is lost.
    }

    if (config.email) {
      push(['set', 'user:email', [config.email]])
      push(['set', 'session:identifier', config.email])
    }
    if (config.nickname) push(['set', 'user:nickname', [config.nickname]])
    const sessionData = Object.entries(config.sessionData)
    if (sessionData.length > 0) push(['set', 'session:data', [sessionData]])
  } catch {
    // Crisp failures must never break the app.
  }
}

export function openCrispChat() {
  push(['do', 'chat:show'])
  push(['do', 'chat:open'])
}
