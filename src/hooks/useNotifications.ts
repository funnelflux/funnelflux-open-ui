import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { create } from "zustand"
import { useAuthStore } from "@/store/auth"
import { api } from "@/api/client"
import { queryKeys } from "@/api/queryKeys"
import { registerProtectedStateReset } from "@/store/protectedState"

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

registerProtectedStateReset(() => useNotificationStore.setState({ unreadCount: 0 }))

/**
 * Unread-count check backed by React Query under `queryKeys.inbox.notifications`, so the
 * `queryKeys.inbox.all` invalidations fired by inbox read/delete mutations refresh the badge.
 * The count is mirrored into `useNotificationStore` for consumers outside this hook.
 */
export function useNotifications(onForcePopup?: (message: string) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  // App.tsx passes an inline arrow; hold it in a ref so effects don't re-fire on identity changes.
  const onForcePopupRef = useRef(onForcePopup)
  useEffect(() => {
    onForcePopupRef.current = onForcePopup
  })

  // Inbox mutations invalidate `inbox.all`, which prefix-matches this query; without this guard a
  // refetch that still carries forcePopup would re-show the same popup after every read/delete.
  const lastPopupMessageRef = useRef<string | null>(null)

  const { data: notificationCheck } = useQuery({
    queryKey: queryKeys.inbox.notifications,
    queryFn: () =>
      api.get<NotificationCheckResponse>("/ui/inbox/notifications/check/"),
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (!notificationCheck) return
    setUnreadCount(notificationCheck.unreadCount ?? 0)
    if (
      notificationCheck.forcePopup &&
      notificationCheck.forcePopupMessage &&
      notificationCheck.forcePopupMessage !== lastPopupMessageRef.current
    ) {
      lastPopupMessageRef.current = notificationCheck.forcePopupMessage
      onForcePopupRef.current?.(notificationCheck.forcePopupMessage)
    }
  }, [notificationCheck, setUnreadCount])
}
