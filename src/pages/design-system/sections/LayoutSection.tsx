import { Button } from '@/components/ui-kit'
import { PageShell, StatCard, SearchToolbar, TimezoneSelect, DateTimeRangePicker } from '@/components/ui-kit'
import { Icon } from '@/components/ui-kit/icons'
import { useState } from 'react'

export function LayoutSection() {
  const [search, setSearch] = useState('')

  return (
    <section id="layout">
      <h2 className="text-xl font-semibold text-foreground mb-6">Layout Patterns</h2>

      <div className="space-y-10">
        {/* Page anatomy */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Page Anatomy</h3>
          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            {/* Header nav bar */}
            <div className="h-12 bg-nav-bg flex items-center px-4 gap-6">
              <img
                src={`${import.meta.env.BASE_URL}logo-full-on-dark.png`}
                alt="FunnelFlux"
                className="h-8 w-auto object-contain"
                decoding="async"
              />
              <div className="flex gap-4">
                {['Dashboard', 'Campaigns', 'Reports', 'Traffic Sources', 'Offers'].map((item) => (
                  <span key={item} className="text-xs text-gray-400 hover:text-gray-0 cursor-pointer">
                    {item}
                  </span>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-gray-400">admin@example.com</span>
              </div>
            </div>

            {/* Page content */}
            <div className="p-6">
              <PageShell
                title="Offers"
                subtitle="Manage your offer pages"
                actions={
                  <Button type="primary" icon={<Icon name="plus" size="sm" />}>
                    New Offer
                  </Button>
                }
              >
                {/* Toolbar strip */}
                <div className="flex items-center gap-3 flex-wrap">
                  <SearchToolbar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search offers..."
                    className="flex-1 min-w-0"
                  />
                  <div className="flex items-center gap-2 ml-auto">
                    <DateTimeRangePicker />
                    <TimezoneSelect />
                    <Button icon={<Icon name="filter" size="sm" />}>Filters</Button>
                    <Button icon={<Icon name="refresh-cw" size="sm" />} />
                  </div>
                </div>

                {/* Content placeholder */}
                <div className="mt-4 p-12 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
                  DataTable here
                </div>
              </PageShell>
            </div>
          </div>
        </div>

        {/* Brand assets */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Brand Assets</h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-surface p-4">
              <div className="mb-3 text-xs font-medium text-muted-foreground">Full logo on light surfaces</div>
              <img
                src={`${import.meta.env.BASE_URL}logo-full-on-light.png`}
                alt="FunnelFlux"
                className="h-12 w-auto object-contain"
                decoding="async"
              />
            </div>
            <div className="rounded-md border border-border bg-nav-bg p-4">
              <div className="mb-3 text-xs font-medium text-gray-400">Full logo on dark navigation</div>
              <img
                src={`${import.meta.env.BASE_URL}logo-full-on-dark.png`}
                alt="FunnelFlux"
                className="h-12 w-auto object-contain"
                decoding="async"
              />
            </div>
          </div>
        </div>

        {/* Grid system */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">CSS Grid System</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Use CSS Grid (via Tailwind <code className="bg-muted px-1.5 py-0.5 rounded">grid</code> utilities) for all page layouts. Grid aligns form fields, cards, and toolbar items consistently.
          </p>

          {/* Grid demo */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 bg-primary-subtle border border-border rounded flex items-center justify-center text-xs text-muted-foreground font-mono">
                col {n}/4
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-primary-subtle border border-border rounded flex items-center justify-center text-xs text-muted-foreground font-mono">
                col {n}/3
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-16 bg-primary-subtle border border-border rounded flex items-center justify-center text-xs text-muted-foreground font-mono">
                col {n}/2
              </div>
            ))}
          </div>
        </div>

        {/* Responsive */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Responsive Breakpoints</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Breakpoint</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Width</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Behavior</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono text-foreground">lg</td>
                  <td className="py-2 pr-4 font-mono">1024px+</td>
                  <td className="py-2">Full layout. All columns visible. Min supported width.</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono text-foreground">xl</td>
                  <td className="py-2 pr-4 font-mono">1280px+</td>
                  <td className="py-2">Wider grids (4-col stat cards, wider tables).</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono text-foreground">2xl</td>
                  <td className="py-2 pr-4 font-mono">1536px+</td>
                  <td className="py-2">Max content width. Extra breathing room.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-foreground">&lt;1024px</td>
                  <td className="py-2 pr-4 font-mono">below lg</td>
                  <td className="py-2">Toolbar wraps. Tables scroll horizontally. Nav collapses.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* StatCard grid responsive */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">StatCard Grid (responsive)</h3>
          <p className="text-xs text-muted-foreground mb-3">
            <code className="bg-muted px-1.5 py-0.5 rounded">grid grid-cols-2 lg:grid-cols-4 gap-4</code> — 2 cols on narrow, 4 on desktop.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Visits" value="124,530" trend={{ value: 12.5, label: 'vs last week' }} />
            <StatCard title="Conversions" value="3,842" trend={{ value: -2.1, label: 'vs last week' }} />
            <StatCard title="Revenue" value="$48,290" trend={{ value: 8.3, label: 'vs last week' }} />
            <StatCard title="ROI" value="142%" trend={{ value: 0, label: 'vs last week' }} />
          </div>
        </div>

        {/* Form grid */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Form Grid</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Forms use <code className="bg-muted px-1.5 py-0.5 rounded">grid grid-cols-1 lg:grid-cols-2 gap-4</code>. Inputs fill their grid cell (<code>w-full</code>).
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-2xl">
            <div className="h-9 bg-muted border border-border rounded flex items-center px-3 text-xs text-muted-foreground">Input (w-full in grid cell)</div>
            <div className="h-9 bg-muted border border-border rounded flex items-center px-3 text-xs text-muted-foreground">Select (w-full in grid cell)</div>
            <div className="h-9 bg-muted border border-border rounded flex items-center px-3 text-xs text-muted-foreground col-span-full">Textarea or wide input (col-span-full)</div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="p-4 bg-muted rounded-lg border border-border text-sm space-y-2">
          <h3 className="font-medium text-foreground">Layout Guidelines</h3>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
            <li>Use <code>grid</code> for page layouts, form fields, card grids. Flexbox for toolbars and inline elements.</li>
            <li>Page padding: <code>p-6</code> (24px). Section gaps: <code>gap-6</code>.</li>
            <li>All single-line inputs are 36px tall (controlled via antd theme <code>controlHeight</code>).</li>
            <li>Toolbar strip: flex with <code>gap-3</code>, search left, date/tz/filters right with <code>ml-auto</code>.</li>
            <li>Tables fill remaining height. Use <code>flex-1</code> or explicit height for DataTable.</li>
            <li>Below 1024px: toolbars wrap, tables scroll horizontally, nav collapses to hamburger.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
