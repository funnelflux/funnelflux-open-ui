import { Link, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/auth"
import type { Permissions } from "@/types/api"
import { Dropdown, type MenuProps } from "@/components/ui-kit"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  BarChart3,
  Shield,
  Tag,
  Filter,
  History,
  Users,
  Inbox,
} from "lucide-react"
import { useThemeStore } from "@/store/theme"

/** Menu `<Link>` labels inherit Ant menu item text color (avoids default blue anchors). */
const menuLinkClass = "cursor-pointer no-underline text-inherit"

interface NavItem {
  label: string
  to: string
  check?: (p: Permissions) => boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", check: (p) => p.stats.canView },
  { label: "Campaigns", to: "/campaigns", check: (p) => p.campaigns.canView },
  {
    label: "Sources",
    to: "/traffic-sources",
    children: [
      { label: "Traffic Sources", to: "/traffic-sources", check: (p) => p.trafficSources.canView },
      { label: "Offer Sources", to: "/offer-sources", check: (p) => p.offerSources.canView },
    ],
  },
  { label: "Offers", to: "/offers", check: (p) => p.offers.canView },
  { label: "Landers", to: "/landers", check: (p) => p.landers.canView },
  {
    label: "Stats",
    to: "/reports",
    check: (p) => p.stats.canView,
    children: [
      { label: "Drilldown (Tree)", to: "/reports/tree" },
      { label: "Drilldown (Flat)", to: "/reports/flat" },
    ],
  },
  {
    label: "Updates",
    to: "/data-updates/conversions",
    check: (p) => Boolean(p.dataUpdates?.enabled),
    children: [
      {
        label: "Conversion Updates",
        to: "/data-updates/conversions",
        check: (p) => Boolean(p.dataUpdates?.canUpdateConversions),
      },
      {
        label: "Cost Updates",
        to: "/data-updates/costs",
        check: (p) => Boolean(p.dataUpdates?.canUpdateTrafficCost),
      },
      {
        label: "Reset Stats",
        to: "/data-updates/reset",
        check: (p) => Boolean(p.dataUpdates?.canResetStats),
      },
    ],
  },
  {
    label: "Links",
    to: "/links",
    children: [
      { label: "System Links", to: "/links/generate", check: (p) => p.systemLinks.canView },
      { label: "Stored Links", to: "/links/stored", check: (p) => p.storedLinks.canView },
    ],
  },
]

function isRouteActive(pathname: string, to: string, children?: NavItem[]): boolean {
  if (to === "/" && pathname === "/") return true
  if (to !== "/") {
    if (pathname === to || pathname.startsWith(to + "/")) return true
  }
  if (children) {
    return children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"))
  }
  return false
}

function NavDropdown({
  item,
  permissions,
  pathname,
}: {
  item: NavItem
  permissions: Permissions
  pathname: string
}) {
  const visibleChildren = (item.children ?? []).filter(
    (c) => !c.check || c.check(permissions),
  )
  if (visibleChildren.length === 0) return null

  const active = isRouteActive(pathname, item.to, visibleChildren)

  const items: MenuProps["items"] = visibleChildren.map((child) => ({
    key: child.to,
    label: (
      <Link to={child.to} className={menuLinkClass}>
        {child.label}
      </Link>
    ),
  }))

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <button
        type="button"
        className={cn(
          "ff-navbar-item px-3 py-2 text-sm rounded flex items-center gap-1 outline-none border-0 bg-transparent",
          active && "ff-navbar-item--active",
        )}
      >
        {item.label}
        <ChevronDown className="h-3 w-3" />
      </button>
    </Dropdown>
  )
}

function DesktopNav({ permissions, pathname }: { permissions: Permissions; pathname: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {navItems.map((item) => {
        if (item.check && !item.check(permissions)) return null

        if (item.children) {
          return (
            <NavDropdown
              key={item.label}
              item={item}
              permissions={permissions}
              pathname={pathname}
            />
          )
        }

        const active = isRouteActive(pathname, item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "ff-navbar-item shrink-0 px-3 py-2 text-sm rounded no-underline",
              active && "ff-navbar-item--active",
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function SettingsDropdown({ permissions }: { permissions: Permissions }) {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin)

  const items: MenuProps["items"] = [
    ...(isAdmin
      ? [
          {
            key: "system",
            label: (
              <Link to="/settings/system" className={menuLinkClass}>
                <BarChart3 className="h-4 w-4 mr-2 inline" /> System Settings
              </Link>
            ),
          },
        ]
      : []),
    ...(permissions.trafficFilters?.canView
      ? [
          {
            key: "traffic-filters",
            label: (
              <Link to="/settings/traffic-filters" className={menuLinkClass}>
                <Filter className="h-4 w-4 mr-2 inline" /> Traffic Filters
              </Link>
            ),
          },
        ]
      : []),
    {
      key: "tags",
      label: (
        <Link to="/settings/tags" className={menuLinkClass}>
          <Tag className="h-4 w-4 mr-2 inline" /> Visitor Tags
        </Link>
      ),
    },
    {
      key: "conditions",
      label: (
        <Link to="/settings/conditions" className={menuLinkClass}>
          <Shield className="h-4 w-4 mr-2 inline" /> Global Conditions
        </Link>
      ),
    },
    ...(isAdmin
      ? [
          { key: "admin-sep", type: "divider" as const },
          {
            key: "access-log",
            label: (
              <Link to="/settings/access-log" className={menuLinkClass}>
                <History className="h-4 w-4 mr-2 inline" /> Access Log
              </Link>
            ),
          },
          {
            key: "users",
            label: (
              <Link to="/settings/users" className={menuLinkClass}>
                <Users className="h-4 w-4 mr-2 inline" /> User Management
              </Link>
            ),
          },
        ]
      : []),
  ]

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <button
        type="button"
        className="ff-navbar-util-btn p-2 rounded outline-none border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings className="h-4 w-4" />
      </button>
    </Dropdown>
  )
}

function UserDropdown() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const handleLogout = () => {
    clearAuth()
    const basePath = import.meta.env.VITE_BASE_PATH_PREFIX || ''
    window.location.href = `${basePath}/admin/login.php?logout=1`
  }

  const items: MenuProps["items"] = [
    {
      key: "inbox",
      label: (
        <Link to="/inbox" className={menuLinkClass}>
          <Inbox className="h-4 w-4 mr-2 inline" /> Inbox
        </Link>
      ),
    },
    { key: "user-sep", type: "divider" },
    {
      key: "logout",
      label: (
        <>
          <LogOut className="h-4 w-4 mr-2 inline" /> Log Out
        </>
      ),
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <button
        type="button"
        className="ff-navbar-util-btn flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-sm rounded outline-none border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user?.firstname || user?.login}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
    </Dropdown>
  )
}

function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const toggle = useThemeStore((s) => s.toggle)

  return (
    <button
      type="button"
      onClick={toggle}
      className="ff-navbar-util-btn p-2 rounded outline-none border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function Navbar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions

  if (!permissions) return null

  return (
    <nav className="ff-navbar bg-nav-bg h-14 px-4 flex items-center gap-2 sticky top-0 z-50 min-w-0">
      <Link to="/" className="ff-navbar-brand font-bold text-lg shrink-0">
        FunnelFlux
      </Link>

      <DesktopNav permissions={permissions} pathname={location.pathname} />

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <SettingsDropdown permissions={permissions} />
        <UserDropdown />
      </div>
    </nav>
  )
}
