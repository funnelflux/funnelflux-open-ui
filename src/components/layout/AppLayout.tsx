import { Outlet, matchPath, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"

export function AppLayout() {
  const { pathname } = useLocation()
  const isFunnelBuilderRoute = Boolean(
    matchPath("/campaigns/:campaignId/funnels/:funnelId", pathname),
  )

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Navbar />
      <main
        className={
          isFunnelBuilderRoute
            ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0"
            : "flex min-h-0 flex-1 flex-col overflow-y-auto p-6"
        }
      >
        <Outlet />
      </main>
    </div>
  )
}
