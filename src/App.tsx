import { Suspense, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { AuthExpiredError } from '@/api/errors'
import { ConfigProvider, AntdApp, Spin } from '@/components/ui-kit'
import { lightTheme, darkTheme } from '@/lib/antd-theme'
import { useThemeStore } from '@/store/theme'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { useToastApi } from '@/components/ui-kit'
import type { UserProfile } from '@/types/api'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { canViewDashboard } from '@/lib/routeAccess'
import { ROUTE_ENTRIES, getDefaultAuthorizedPath } from '@/lib/routeRegistry'

const dashboardPageComponent = ROUTE_ENTRIES.find((e) => e.index)?.Component

function createQueryClient() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AuthExpiredError) {
          useAuthStore.getState().clearAuth()
          queryClient.clear()
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof AuthExpiredError) {
          useAuthStore.getState().clearAuth()
          queryClient.clear()
        }
      },
    }),
    defaultOptions: {
      queries: {
        /** No automatic refetch on timer, tab focus, or reconnect — explicit invalidate / Refresh only. */
        staleTime: Number.POSITIVE_INFINITY,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  })
  return queryClient
}

function PermissionGuard({
  check,
  children,
}: {
  check: (user: UserProfile) => boolean
  children: ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  if (!user || !check(user)) {
    return <Navigate to={getDefaultAuthorizedPath(user)} replace />
  }
  return <>{children}</>
}

function IndexRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  if (canViewDashboard(user.permissions)) {
    if (!dashboardPageComponent) return null
    const Dashboard = dashboardPageComponent
    return (
      <Suspense fallback={<div className="p-4 text-muted-foreground">Loading...</div>}>
        <Dashboard />
      </Suspense>
    )
  }
  return <Navigate to={getDefaultAuthorizedPath(user)} replace />
}

function FallbackRoute() {
  const user = useAuthStore((s) => s.user)
  return <Navigate to={getDefaultAuthorizedPath(user)} replace />
}

function NotificationPoller() {
  const toast = useToastApi()
  useNotifications((msg) => toast.info(msg))
  return null
}

function SessionBootstrappingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6">
      <Spin size="large" />
      <div className="text-muted-foreground text-sm">Checking session…</div>
    </div>
  )
}

function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth()

  if (isLoading) {
    return <SessionBootstrappingScreen />
  }

  if (error && error !== 'AUTH_REQUIRED') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-background rounded-lg shadow-md p-8 max-w-md text-center border">
          <h2 className="text-lg font-bold text-destructive mb-2">Connection Error</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || error === 'AUTH_REQUIRED') {
    return <LoginPage />
  }

  return (
    <>
      <NotificationPoller />
      {children}
    </>
  )
}

function AppRoutes() {
  const appRoutes = ROUTE_ENTRIES.filter((e) => e.layout === 'app')

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<IndexRoute />} />

        {appRoutes
          .filter((e) => !e.index)
          .map((entry) => {
            const Page = entry.Component
            return (
              <Route
                key={entry.path}
                path={entry.path}
                element={
                  <PermissionGuard check={entry.permission}>
                    <Suspense
                      fallback={<div className="p-4 text-muted-foreground">Loading...</div>}
                    >
                      <Page />
                    </Suspense>
                  </PermissionGuard>
                }
              />
            )
          })}

        <Route path="*" element={<FallbackRoute />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const [queryClient] = useState(createQueryClient)
  const themeMode = useThemeStore((s) => s.mode)
  const antdTheme = themeMode === 'dark' ? darkTheme : lightTheme

  const publicEntries = ROUTE_ENTRIES.filter((e) => e.layout === 'public')

  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp message={{ maxCount: 3 }}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={import.meta.env.VITE_UI_BASENAME || '/v2-ui'}>
            <Routes>
              {publicEntries.map((entry) => {
                const Page = entry.Component
                return (
                  <Route
                    key={entry.path}
                    path={entry.path}
                    element={
                      <Suspense fallback={<div className="p-8">Loading...</div>}>
                        <Page />
                      </Suspense>
                    }
                  />
                )
              })}
              <Route
                path="*"
                element={
                  <AuthGate>
                    <ErrorBoundary>
                      <Suspense
                        fallback={(
                          <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
                            Loading...
                          </div>
                        )}
                      >
                        <AppRoutes />
                      </Suspense>
                    </ErrorBoundary>
                  </AuthGate>
                }
              />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
