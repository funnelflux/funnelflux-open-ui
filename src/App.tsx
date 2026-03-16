import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CampaignsPage } from '@/pages/CampaignsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Connecting...</div>
      </div>
    )
  }

  if (!isAuthenticated || error === 'AUTH_REQUIRED') {
    return <LoginPage />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <h2 className="text-lg font-bold text-red-600 mb-2">Connection Error</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">{title}</h1>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">Coming soon.</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="reports/tree" element={<Placeholder title="Drilldown (Tree)" />} />
        <Route path="reports/flat" element={<Placeholder title="Drilldown (Flat)" />} />
        <Route path="traffic-sources" element={<Placeholder title="Traffic Sources" />} />
        <Route path="offer-sources" element={<Placeholder title="Offer Sources" />} />
        <Route path="offers" element={<Placeholder title="Offers" />} />
        <Route path="landers" element={<Placeholder title="Landers" />} />
        <Route path="links/generate" element={<Placeholder title="System Links" />} />
        <Route path="links/stored" element={<Placeholder title="Stored Links" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/v2-ui">
        <AuthGate>
          <AppRoutes />
        </AuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
