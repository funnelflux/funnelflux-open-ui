import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { Dropdown, type MenuProps } from '@/components/ui-kit/Dropdown'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/theme'
import {
  getMainNavStructure,
  getSettingsNavLinks,
  getUserMenuNavLinks,
  type NavLinkItem,
  type MainNavTopItem,
} from '@/lib/routeRegistry'

/** Menu `<Link>` labels inherit Ant menu item text color (avoids default blue anchors). */
const menuLinkClass = 'cursor-pointer no-underline text-inherit'

function isRouteActive(pathname: string, to: string, children?: NavLinkItem[]): boolean {
  if (to === '/' && pathname === '/') return true
  if (to !== '/') {
    if (pathname === to || pathname.startsWith(`${to}/`)) return true
  }
  if (children) {
    return children.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`))
  }
  return false
}

function isMenuActive(pathname: string, item: Extract<MainNavTopItem, { kind: 'menu' }>): boolean {
  const { section, children } = item
  if (pathname === section.basePath || pathname.startsWith(`${section.basePath}/`)) {
    return true
  }
  return isRouteActive(pathname, section.basePath, children)
}

function NavDropdown({
  item,
  pathname,
}: {
  item: Extract<MainNavTopItem, { kind: 'menu' }>
  pathname: string
}) {
  const { children, section } = item
  if (children.length === 0) return null

  const active = isMenuActive(pathname, item)

  const items: MenuProps['items'] = children.map((child) => ({
    key: child.to,
    label: (
      <Link to={child.to} className={menuLinkClass}>
        {child.label}
      </Link>
    ),
  }))

  return (
    <Dropdown menu={{ items }} trigger={['hover', 'click']}>
      <button
        type="button"
        className={cn(
          'ff-navbar-item cursor-pointer px-3 py-2 text-sm rounded flex items-center gap-1 outline-none border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]',
          active && 'ff-navbar-item--active',
        )}
      >
        {section.label}
        <Icon name="chevron-down" size="sm" />
      </button>
    </Dropdown>
  )
}

function DesktopNav({
  mainNav: structure,
  pathname,
}: {
  mainNav: MainNavTopItem[]
  pathname: string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {structure.map((item) => {
        if (item.kind === 'menu') {
          return <NavDropdown key={item.section.id} item={item} pathname={pathname} />
        }

        const active = isRouteActive(pathname, item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'ff-navbar-item shrink-0 px-3 py-2 text-sm rounded no-underline outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]',
              active && 'ff-navbar-item--active',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function MainNavDropdown({
  mainNav: structure,
}: {
  mainNav: MainNavTopItem[]
}) {
  const items: MenuProps['items'] = structure.map((item) => {
    if (item.kind === 'menu') {
      return {
        key: item.section.id,
        label: item.section.label,
        children: item.children.map((child) => ({
          key: child.to,
          label: (
            <Link to={child.to} className={menuLinkClass}>
              {child.label}
            </Link>
          ),
        })),
      }
    }

    return {
      key: item.to,
      label: (
        <Link to={item.to} className={menuLinkClass}>
          {item.label}
        </Link>
      ),
    }
  })

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <button
        type="button"
        className="ff-navbar-util-btn flex shrink-0 cursor-pointer items-center gap-1.5 rounded border-0 bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
        aria-label="Open navigation menu"
      >
        <Icon name="menu" />
        <span className="hidden sm:inline">Menu</span>
      </button>
    </Dropdown>
  )
}

function SettingsDropdown({ settingsLinks }: { settingsLinks: NavLinkItem[] }) {
  const items: MenuProps['items'] = []

  for (const link of settingsLinks) {
    if (link.to === '/settings/access-log') {
      items.push({ key: 'admin-sep', type: 'divider' })
    }
    items.push({
      key: link.to,
      label: (
        link.external ? (
          <a href={link.to} className={menuLinkClass} target="_blank" rel="noreferrer">
            {link.icon ? (
              <span className="mr-2 inline-flex align-middle">
                <Icon name={link.icon} />
              </span>
            ) : null}
            {link.label}
          </a>
        ) : (
          <Link to={link.to} className={menuLinkClass}>
            {link.icon ? (
              <span className="mr-2 inline-flex align-middle">
                <Icon name={link.icon} />
              </span>
            ) : null}
            {link.label}
          </Link>
        )
      ),
    })
  }

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <button
        type="button"
        className="ff-navbar-util-btn cursor-pointer p-2 rounded outline-none border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
        aria-label="Settings"
      >
        <Icon name="settings" />
      </button>
    </Dropdown>
  )
}

function UserDropdown({ userLinks }: { userLinks: NavLinkItem[] }) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()

  const handleLogout = () => {
    clearAuth()
    queryClient.clear()
    const basePath = import.meta.env.VITE_BASE_PATH_PREFIX || ''
    window.location.href = `${basePath}/admin/login.php?logout=1`
  }

  const items: MenuProps['items'] = [
    ...userLinks.map((link) => ({
      key: link.to,
      label: (
        <Link to={link.to} className={menuLinkClass}>
          {link.icon ? (
            <span className="mr-2 inline-flex align-middle">
              <Icon name={link.icon} />
            </span>
          ) : null}
          {link.label}
        </Link>
      ),
    })),
    { key: 'user-sep', type: 'divider' as const },
    {
      key: 'logout',
      label: (
        <>
          <span className="mr-2 inline-flex align-middle">
            <Icon name="log-out" />
          </span>
          Log Out
        </>
      ),
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <button
        type="button"
        aria-label="User account menu"
        className="ff-navbar-util-btn flex shrink-0 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-sm rounded outline-none border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
      >
        <Icon name="user" />
        <span className="hidden sm:inline">{user?.firstname || user?.login}</span>
        <Icon name="chevron-down" size="sm" />
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
      className="ff-navbar-util-btn cursor-pointer p-2 rounded outline-none border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {mode === 'dark' ? <Icon name="sun" /> : <Icon name="moon" />}
    </button>
  )
}

export function Navbar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const permissions = user?.permissions

  if (!permissions || !user) return null

  const mainNav = getMainNavStructure(user)
  const settingsLinks = getSettingsNavLinks(user)
  const userLinks = getUserMenuNavLinks(user)

  return (
    <nav className="ff-navbar bg-nav-bg h-14 px-4 flex items-center gap-2 sticky top-0 z-50 min-w-0">
      <Link
        to="/"
        className="ff-navbar-brand mr-2 flex shrink-0 items-center gap-2 rounded font-bold text-lg no-underline text-inherit outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
      >
        <img
          src={`${import.meta.env.BASE_URL}logo-full-on-dark.png`}
          alt="FunnelFlux"
          width={158}
          height={32}
          className="h-8 w-auto shrink-0 object-contain"
          decoding="async"
        />
      </Link>

      <div className="min-[1400px]:hidden">
        <MainNavDropdown mainNav={mainNav} />
      </div>

      <div className="hidden min-w-0 flex-1 min-[1400px]:flex">
        <DesktopNav mainNav={mainNav} pathname={location.pathname} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeToggle />
        {settingsLinks.length > 0 ? <SettingsDropdown settingsLinks={settingsLinks} /> : null}
        <UserDropdown userLinks={userLinks} />
      </div>
    </nav>
  )
}
