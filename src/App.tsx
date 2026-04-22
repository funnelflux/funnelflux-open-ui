import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConfigProvider, AntdApp } from "@/components/ui-kit"
import { lightTheme, darkTheme } from "@/lib/antd-theme"
import { useThemeStore } from "@/store/theme"
import { useAuth } from "@/hooks/useAuth"
import { useNotifications } from "@/hooks/useNotifications"
import { useAuthStore } from "@/store/auth"
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/pages/LoginPage"
import { useToastApi } from "@/components/ui-kit"
import type { Permissions } from "@/types/api"
import { lazy, Suspense } from "react"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

const lazyPage = (loader: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(() => loader().then((m) => {
    const component = m[name] as React.ComponentType
    if (!component) throw new Error(`Module does not export "${name}"`)
    return { default: component }
  }))

const DashboardPage = lazyPage(() => import("@/pages/DashboardPage"), "DashboardPage")
const CampaignsPage = lazyPage(() => import("@/pages/campaigns/CampaignsPage"), "CampaignsPage")
const TrafficSourcesPage = lazyPage(() => import("@/pages/traffic-sources/TrafficSourcesPage"), "TrafficSourcesPage")
const OfferSourcesPage = lazyPage(() => import("@/pages/offer-sources/OfferSourcesPage"), "OfferSourcesPage")
const LandersPage = lazyPage(() => import("@/pages/landers/LandersPage"), "LandersPage")
const OffersPage = lazyPage(() => import("@/pages/offers/OffersPage"), "OffersPage")
const FunnelEditorPage = lazyPage(() => import("@/pages/funnels/FunnelEditorPage"), "FunnelEditorPage")
const FunnelBuilderLegacyRedirect = lazyPage(() => import("@/pages/funnels/FunnelBuilderLegacyRedirect"), "FunnelBuilderLegacyRedirect")
const DrilldownTreePage = lazyPage(() => import("@/pages/reports/DrilldownTreePage"), "DrilldownTreePage")
const DrilldownFlatPage = lazyPage(() => import("@/pages/reports/DrilldownFlatPage"), "DrilldownFlatPage")
const QuickViewPage = lazyPage(() => import("@/pages/quickview/QuickViewPage"), "QuickViewPage")
const SystemLinksPage = lazyPage(() => import("@/pages/links/SystemLinksPage"), "SystemLinksPage")
const StoredLinksPage = lazyPage(() => import("@/pages/links/StoredLinksPage"), "StoredLinksPage")
const TagsPage = lazyPage(() => import("@/pages/settings/TagsPage"), "TagsPage")
const TrafficFiltersPage = lazyPage(() => import("@/pages/settings/TrafficFiltersPage"), "TrafficFiltersPage")
const SystemSettingsPage = lazyPage(() => import("@/pages/settings/SystemSettingsPage"), "SystemSettingsPage")
const UserManagementPage = lazyPage(() => import("@/pages/settings/UserManagementPage"), "UserManagementPage")
const UserEditPage = lazyPage(() => import("@/pages/settings/UserEditPage"), "UserEditPage")
const AccessLogPage = lazyPage(() => import("@/pages/settings/AccessLogPage"), "AccessLogPage")
const GlobalConditionsPage = lazyPage(() => import("@/pages/settings/GlobalConditionsPage"), "GlobalConditionsPage")
const InboxPage = lazyPage(() => import("@/pages/inbox/InboxPage"), "InboxPage")
const ConversionsPage = lazyPage(() => import("@/pages/data-updates/ConversionsPage"), "ConversionsPage")
const CostUpdatePage = lazyPage(() => import("@/pages/data-updates/CostUpdatePage"), "CostUpdatePage")
const ResetStatsPage = lazyPage(() => import("@/pages/data-updates/ResetStatsPage"), "ResetStatsPage")
const DesignSystemPage = lazyPage(() => import("@/pages/design-system/DesignSystemPage"), "DesignSystemPage")

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  })
}

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
  const toast = useToastApi()
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

        <Route
          path="funnel-builder/:id"
          element={guarded((p) => p.campaigns.canEdit, <FunnelBuilderLegacyRedirect />)}
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
  const [queryClient] = useState(createQueryClient)
  const themeMode = useThemeStore((s) => s.mode)
  const antdTheme = themeMode === 'dark' ? darkTheme : lightTheme

  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp message={{ maxCount: 3 }}>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={import.meta.env.VITE_UI_BASENAME || '/v2-ui'}>
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
                <Route path="*" element={<AuthGate><ErrorBoundary><Suspense fallback={<div className="flex items-center justify-center h-full p-8 text-muted-foreground">Loading...</div>}><AppRoutes /></Suspense></ErrorBoundary></AuthGate>} />
              </Routes>
            </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
