import { useEffect } from "react"
import { Outlet, matchPath, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { ROUTE_ENTRIES, entryPathToHref } from "@/lib/routeRegistry"

/** Sync `document.title` with the current route's nav label. */
function useRouteDocumentTitle(pathname: string) {
  useEffect(() => {
    const entry = ROUTE_ENTRIES.find(
      (e) =>
        e.layout === "app" &&
        matchPath({ path: entryPathToHref(e.path), end: true }, pathname) != null,
    )
    const label = entry?.nav?.label
    document.title = label ? `${label} — FunnelFlux` : "FunnelFlux"
  }, [pathname])
}

export function AppLayout() {
  const { pathname } = useLocation()
  useRouteDocumentTitle(pathname)
  const isFunnelBuilderRoute = Boolean(
    matchPath("/campaigns/:campaignId/funnels/:funnelId", pathname),
  )

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className={
          isFunnelBuilderRoute
            ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0 outline-none"
            : "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-4 min-[1600px]:p-6 outline-none"
        }
      >
        {/* Page-level crashes keep the navbar usable; the App-level boundary stays as last
            resort. Keyed by pathname so navigating away from a crashed page resets the boundary. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
