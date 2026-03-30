import { useEffect } from "react"
import { create } from "zustand"
import { useAuthStore } from "@/store/auth"
import { api } from "@/api/client"

interface NotificationCheckResponse {
  unreadCount?: number
  forcePopup?: boolean
  forcePopupMessage?: string
}

interface NotificationState {
  unreadCount: number
  setUnreadCount: (count: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}))

const POLL_INTERVAL = 45_000

export function useNotifications(onForcePopup?: (message: string) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  useEffect(() => {
    if (!isAuthenticated) return

    let active = true

    const check = async () => {
      try {
        const data = await api.get<NotificationCheckResponse>(
          "/ui/inbox/notifications/check/",
        )
        if (!active) return
        setUnreadCount(data.unreadCount ?? 0)
        if (data.forcePopup && data.forcePopupMessage) {
          onForcePopup?.(data.forcePopupMessage)
        }
      } catch {
        // silently ignore polling errors
      }
    }

    check()
    const interval = setInterval(check, POLL_INTERVAL)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isAuthenticated, setUnreadCount, onForcePopup])
}
