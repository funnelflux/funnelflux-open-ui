import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConfigProvider, App as AntApp } from "antd"
import { lightTheme, darkTheme } from "@/lib/antd-theme"
import { useThemeStore } from "@/store/theme"
import { useAuth } from "@/hooks/useAuth"
import { useNotifications } from "@/hooks/useNotifications"
import { useAuthStore } from "@/store/auth"
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { CampaignsPage } from "@/pages/campaigns/CampaignsPage"
import { TrafficSourcesPage } from "@/pages/traffic-sources/TrafficSourcesPage"
import { OfferSourcesPage } from "@/pages/offer-sources/OfferSourcesPage"
import { LandersPage } from "@/pages/landers/LandersPage"
import { OffersPage } from "@/pages/offers/OffersPage"
import { TagsPage } from "@/pages/settings/TagsPage"
import { TrafficFiltersPage } from "@/pages/settings/TrafficFiltersPage"
import { SystemSettingsPage } from "@/pages/settings/SystemSettingsPage"
import { UserManagementPage } from "@/pages/settings/UserManagementPage"
import { UserEditPage } from "@/pages/settings/UserEditPage"
import { AccessLogPage } from "@/pages/settings/AccessLogPage"
import { InboxPage } from "@/pages/inbox/InboxPage"
import { DrilldownTreePage } from "@/pages/reports/DrilldownTreePage"
import { DrilldownFlatPage } from "@/pages/reports/DrilldownFlatPage"
import { QuickViewPage } from "@/pages/quickview/QuickViewPage"
import { SystemLinksPage } from "@/pages/links/SystemLinksPage"
import { StoredLinksPage } from "@/pages/links/StoredLinksPage"
import { ConversionsPage } from "@/pages/data-updates/ConversionsPage"
import { CostUpdatePage } from "@/pages/data-updates/CostUpdatePage"
import { ResetStatsPage } from "@/pages/data-updates/ResetStatsPage"
import { FunnelEditorPage } from "@/pages/funnels/FunnelEditorPage"
import { GlobalConditionsPage } from "@/pages/settings/GlobalConditionsPage"
import { ToastProvider, useToast } from "@/components/shared/Toaster"
import type { Permissions } from "@/types/api"
import { lazy, Suspense } from "react"

const DesignSystemPage = lazy(() =>
  import("@/pages/design-system/DesignSystemPage").then((m) => ({
    default: m.DesignSystemPage,
  })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function PermissionGuard({
  check,
  children,
}: {
  check: (p: Permissions) => boolean
  children: React.ReactNode
}) {
  const permissions = useAuthStore((s) => s.user?.permissions)
  if (!permissions || !check(permissions)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function guarded(check: (p: Permissions) => boolean, element: React.ReactNode) {
  return <PermissionGuard check={check}>{element}</PermissionGuard>
}

function NotificationPoller() {
  const toast = useToast()
  useNotifications((msg) => toast.info(msg))
  return null
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Connecting...</div>
      </div>
    )
  }

  if (!isAuthenticated || error === "AUTH_REQUIRED") {
    return <LoginPage />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-background rounded-lg shadow-md p-8 max-w-md text-center border">
          <h2 className="text-lg font-bold text-destructive mb-2">Connection Error</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <NotificationPoller />
      {children}
    </>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />

        {/* Campaigns */}
        <Route
          path="campaigns"
          element={guarded((p) => p.campaigns.canView, <CampaignsPage />)}
        />

        {/* Funnel Editor */}
        <Route
          path="campaigns/:campaignId/funnels/:funnelId"
          element={guarded((p) => p.campaigns.canEdit, <FunnelEditorPage />)}
        />

        {/* Reports */}
        <Route
          path="reports/tree"
          element={guarded((p) => p.stats.canView, <DrilldownTreePage />)}
        />
        <Route
          path="reports/flat"
          element={guarded((p) => p.stats.canView, <DrilldownFlatPage />)}
        />
        <Route
          path="quickview"
          element={guarded((p) => p.stats.canView, <QuickViewPage />)}
        />

        {/* Entity pages */}
        <Route
          path="traffic-sources"
          element={guarded((p) => p.trafficSources.canView, <TrafficSourcesPage />)}
        />
        <Route
          path="offer-sources"
          element={guarded((p) => p.offerSources.canView, <OfferSourcesPage />)}
        />
        <Route
          path="offers"
          element={guarded((p) => p.offers.canView, <OffersPage />)}
        />
        <Route
          path="landers"
          element={guarded((p) => p.landers.canView, <LandersPage />)}
        />

        {/* Links */}
        <Route
          path="links/generate"
          element={guarded((p) => p.systemLinks.canView, <SystemLinksPage />)}
        />
        <Route
          path="links/stored"
          element={guarded((p) => p.storedLinks.canView, <StoredLinksPage />)}
        />

        {/* Settings */}
        <Route path="settings/system" element={<SystemSettingsPage />} />
        <Route
          path="settings/traffic-filters"
          element={guarded(
            (p) => p.trafficFilters.canView,
            <TrafficFiltersPage />,
          )}
        />
        <Route path="settings/tags" element={<TagsPage />} />
        <Route path="settings/conditions" element={<GlobalConditionsPage />} />
        <Route path="settings/access-log" element={<AccessLogPage />} />
        <Route path="settings/users" element={<UserManagementPage />} />
        <Route path="settings/users/new" element={<UserEditPage />} />
        <Route path="settings/users/:userId/edit" element={<UserEditPage />} />

        {/* Data Updates */}
        <Route
          path="data-updates/conversions"
          element={guarded(
            (p) => p.dataUpdates.canUpdateConversions,
            <ConversionsPage />,
          )}
        />
        <Route
          path="data-updates/costs"
          element={guarded(
            (p) => p.dataUpdates.canUpdateTrafficCost,
            <CostUpdatePage />,
          )}
        />
        <Route
          path="data-updates/reset"
          element={guarded(
            (p) => p.dataUpdates.canResetStats,
            <ResetStatsPage />,
          )}
        />

        {/* Inbox */}
        <Route path="inbox" element={<InboxPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const themeMode = useThemeStore((s) => s.mode)
  const antdTheme = themeMode === 'dark' ? darkTheme : lightTheme

  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp message={{ maxCount: 3 }}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <BrowserRouter basename="/v2-ui">
              <Routes>
                {/* Design system reference (no auth required) */}
                <Route
                  path="design-system"
                  element={
                    <Suspense fallback={<div className="p-8">Loading...</div>}>
                      <DesignSystemPage />
                    </Suspense>
                  }
                />
                {/* All other routes require auth */}
                <Route path="*" element={<AuthGate><AppRoutes /></AuthGate>} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
