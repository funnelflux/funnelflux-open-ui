import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { Permissions } from '@/types/api'

interface NavItem {
  label: string
  to: string
  check?: (p: Permissions) => boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', check: (p) => p.stats.canView },
  { label: 'Campaigns', to: '/campaigns', check: (p) => p.campaigns.canView },
  {
    label: 'Stats',
    to: '/reports',
    check: (p) => p.stats.canView,
    children: [
      { label: 'Drilldown (Tree)', to: '/reports/tree' },
      { label: 'Drilldown (Flat)', to: '/reports/flat' },
    ],
  },
  {
    label: 'Sources',
    to: '/traffic-sources',
    children: [
      { label: 'Traffic Sources', to: '/traffic-sources', check: (p) => p.trafficSources.canView },
      { label: 'Offer Sources', to: '/offer-sources', check: (p) => p.offerSources.canView },
    ],
  },
  { label: 'Offers', to: '/offers', check: (p) => p.offers.canView },
  { label: 'Landers', to: '/landers', check: (p) => p.landers.canView },
  {
    label: 'Links',
    to: '/links',
    children: [
      { label: 'System Links', to: '/links/generate', check: (p) => p.systemLinks.canView },
      { label: 'Stored Links', to: '/links/stored', check: (p) => p.storedLinks.canView },
    ],
  },
]

export function Navbar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions

  if (!permissions) return null

  return (
    <nav className="bg-slate-800 text-white h-14 px-4 flex items-center gap-1 sticky top-0 z-50">
      <Link to="/" className="font-bold text-lg mr-4 text-white no-underline">
        FunnelFlux
      </Link>

      {navItems.map((item) => {
        if (item.check && !item.check(permissions)) return null

        if (item.children) {
          const visibleChildren = item.children.filter(
            (c) => !c.check || c.check(permissions),
          )
          if (visibleChildren.length === 0) return null

          return (
            <div key={item.label} className="relative group">
              <button className="px-3 py-2 text-sm rounded hover:bg-slate-700 text-slate-200">
                {item.label} <span className="text-xs">▾</span>
              </button>
              <div className="absolute left-0 top-full hidden group-hover:block bg-slate-800 rounded shadow-lg min-w-48 py-1 z-50">
                {visibleChildren.map((child) => (
                  <Link
                    key={child.to}
                    to={child.to}
                    className={`block px-4 py-2 text-sm no-underline hover:bg-slate-700 ${
                      location.pathname === child.to ? 'text-white bg-slate-700' : 'text-slate-300'
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          )
        }

        const isActive = location.pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`px-3 py-2 text-sm rounded no-underline ${
              isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {item.label}
          </Link>
        )
      })}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-slate-400">
          {user?.firstname || user?.login}
        </span>
      </div>
    </nav>
  )
}
