import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth"
import type { Permissions } from "@/types/api"
import { Badge, Drawer, Dropdown, Button, type MenuProps } from "@/components/ui-kit"
import {
  ChevronDown,
  Settings,
  User,
  LogOut,
  Menu,
  Bell,
  Sun,
  Moon,
  BarChart3,
  Shield,
  Tag,
  Filter,
  History,
  Users,
  Inbox,
  Database,
  DollarSign,
  Trash2,
} from "lucide-react"
import { useNotificationStore } from "@/hooks/useNotifications"
import { useThemeStore } from "@/store/theme"

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
    label: "Stats",
    to: "/reports",
    check: (p) => p.stats.canView,
    children: [
      { label: "Drilldown (Tree)", to: "/reports/tree" },
      { label: "Drilldown (Flat)", to: "/reports/flat" },
    ],
  },
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

  const items: MenuProps['items'] = visibleChildren.map((child) => ({
    key: child.to,
    label: <Link to={child.to} className="cursor-pointer">{child.label}</Link>,
  }))

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <button
        className={`px-3 py-2 text-sm rounded flex items-center gap-1 outline-none ${
          active ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
        }`}
      >
        {item.label}
        <ChevronDown className="h-3 w-3" />
      </button>
    </Dropdown>
  )
}

function DesktopNav({ permissions, pathname }: { permissions: Permissions; pathname: string }) {
  return (
    <div className="hidden md:flex items-center gap-0.5">
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
            className={`px-3 py-2 text-sm rounded no-underline ${
              active ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function MobileNav({ permissions, pathname }: { permissions: Permissions; pathname: string }) {
  const [open, setOpen] = useState(false)

  const allLinks: { label: string; to: string }[] = []
  for (const item of navItems) {
    if (item.check && !item.check(permissions)) continue
    if (item.children) {
      for (const child of item.children) {
        if (child.check && !child.check(permissions)) continue
        allLinks.push({ label: child.label, to: child.to })
      }
    } else {
      allLinks.push({ label: item.label, to: item.to })
    }
  }

  return (
    <>
      <Button type="text" className="md:hidden text-gray-300 hover:text-white hover:bg-gray-700" onClick={() => setOpen(true)} icon={<Menu className="h-5 w-5" />} />
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" size={256} closable={false} styles={{ body: { padding: 0 }, header: { display: 'none' } }} className="bg-nav-bg">
        <div className="h-full bg-nav-bg text-white">
          <div className="p-4 border-b border-gray-700">
            <span className="font-bold text-lg">FunnelFlux</span>
          </div>
          <nav className="p-2">
            {allLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 text-sm rounded no-underline ${
                  pathname === link.to ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Drawer>
    </>
  )
}

function SettingsDropdown({ permissions }: { permissions: Permissions }) {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin)

  const items: MenuProps['items'] = [
    ...(isAdmin ? [{
      key: 'system',
      label: <Link to="/settings/system" className="cursor-pointer"><BarChart3 className="h-4 w-4 mr-2 inline" /> System Settings</Link>,
    }] : []),
    ...(permissions.trafficFilters?.canView ? [{
      key: 'traffic-filters',
      label: <Link to="/settings/traffic-filters" className="cursor-pointer"><Filter className="h-4 w-4 mr-2 inline" /> Traffic Filters</Link>,
    }] : []),
    {
      key: 'tags',
      label: <Link to="/settings/tags" className="cursor-pointer"><Tag className="h-4 w-4 mr-2 inline" /> Visitor Tags</Link>,
    },
    {
      key: 'conditions',
      label: <Link to="/settings/conditions" className="cursor-pointer"><Shield className="h-4 w-4 mr-2 inline" /> Global Conditions</Link>,
    },
    ...(isAdmin ? [
      { key: 'admin-sep', type: 'divider' as const },
      {
        key: 'access-log',
        label: <Link to="/settings/access-log" className="cursor-pointer"><History className="h-4 w-4 mr-2 inline" /> Access Log</Link>,
      },
      {
        key: 'users',
        label: <Link to="/settings/users" className="cursor-pointer"><Users className="h-4 w-4 mr-2 inline" /> User Management</Link>,
      },
    ] : []),
    ...(permissions.dataUpdates?.enabled ? [
      { key: 'data-sep', type: 'divider' as const },
      ...(permissions.dataUpdates.canUpdateConversions ? [{
        key: 'conversions',
        label: <Link to="/data-updates/conversions" className="cursor-pointer"><Database className="h-4 w-4 mr-2 inline" /> Conversions</Link>,
      }] : []),
      ...(permissions.dataUpdates.canUpdateTrafficCost ? [{
        key: 'costs',
        label: <Link to="/data-updates/costs" className="cursor-pointer"><DollarSign className="h-4 w-4 mr-2 inline" /> Cost Update</Link>,
      }] : []),
      ...(permissions.dataUpdates.canResetStats ? [{
        key: 'reset',
        label: <Link to="/data-updates/reset" className="cursor-pointer"><Trash2 className="h-4 w-4 mr-2 inline" /> Reset Stats</Link>,
      }] : []),
    ] : []),
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
    window.location.href = "/admin/login.php?logout=1"
  }

  const items: MenuProps['items'] = [
    {
      key: 'inbox',
      label: <Link to="/inbox" className="cursor-pointer"><Inbox className="h-4 w-4 mr-2 inline" /> Inbox</Link>,
    },
    { key: 'user-sep', type: 'divider' },
    {
      key: 'logout',
      label: <><LogOut className="h-4 w-4 mr-2 inline" /> Log Out</>,
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <button className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user?.firstname || user?.login}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
    </Dropdown>
  )
}

function NotificationBell() {
  const count = useNotificationStore((s) => s.unreadCount)
  const navigate = useNavigate()

  return (
    <Badge count={count} size="small" overflowCount={99}>
      <button
        className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
        onClick={() => navigate("/inbox")}
      >
        <Bell className="h-4 w-4" />
      </button>
    </Badge>
  )
}

function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const toggle = useThemeStore((s) => s.toggle)

  return (
    <button
      onClick={toggle}
      className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function Navbar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions

  if (!permissions) return null

  return (
    <nav className="bg-nav-bg text-white h-14 px-4 flex items-center gap-1 sticky top-0 z-50">
      <MobileNav permissions={permissions} pathname={location.pathname} />

      <Link to="/" className="font-bold text-lg mr-4 text-white no-underline">
        FunnelFlux
      </Link>

      <DesktopNav permissions={permissions} pathname={location.pathname} />

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
        <SettingsDropdown permissions={permissions} />
        <UserDropdown />
      </div>
    </nav>
  )
}
