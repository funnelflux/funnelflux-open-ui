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

type CrispCommand = unknown[]

declare global {
  interface Window {
    $crisp?: CrispCommand[]
    CRISP_WEBSITE_ID?: string
  }
}

let identityEmail: string | null = null

function push(command: CrispCommand) {
  try {
    window.$crisp?.push(command)
  } catch {
    // Crisp failures must never break the app.
  }
}

function hideLauncher() {
  push(['do', 'chat:hide'])
}

/**
 * Load the Crisp SDK (first call only) and apply the user's identity. Safe to call again with a
 * new config: a different email resets the Crisp session so users never share a conversation.
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
      window.setTimeout(hideLauncher, HIDE_LAUNCHER_FALLBACK_MS)
    }

    if (identityEmail === config.email) return
    if (identityEmail !== null) push(['do', 'session:reset'])
    identityEmail = config.email

    if (config.email) {
      push(['set', 'user:email', config.email])
      push(['set', 'session:identifier', config.email])
    }
    if (config.nickname) push(['set', 'user:nickname', config.nickname])
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
