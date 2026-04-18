import { Tabs, Breadcrumb, Segmented } from '@/components/ui-kit'
import { useState } from 'react'

export function NavigationSection() {
  const [segment, setSegment] = useState<string>('daily')

  return (
    <section id="navigation">
      <h2 className="text-xl font-semibold text-foreground mb-6">Navigation</h2>

      <div className="space-y-8 max-w-2xl">
        {/* Tabs (content tabs, not primary nav) */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Content Tabs</h3>
          <p className="text-xs text-muted-foreground mb-3">
            For switching content panels within a page (e.g. settings sections, entity detail views). Not for primary navigation.
          </p>
          <Tabs
            items={[
              { key: '1', label: 'Overview', children: <p className="text-sm text-muted-foreground">Overview content</p> },
              { key: '2', label: 'Analytics', children: <p className="text-sm text-muted-foreground">Analytics content</p> },
              { key: '3', label: 'Settings', children: <p className="text-sm text-muted-foreground">Settings content</p> },
            ]}
          />
        </div>

        {/* Breadcrumbs */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Breadcrumbs</h3>
          <Breadcrumb
            items={[
              { title: 'Home' },
              { title: 'Campaigns' },
              { title: 'Campaign Alpha' },
            ]}
          />
        </div>

        {/* Segmented */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Segmented Control</h3>
          <p className="text-xs text-muted-foreground mb-3">
            For toggling between view modes (e.g. daily/weekly/monthly, list/grid).
          </p>
          <Segmented
            options={['Daily', 'Weekly', 'Monthly']}
            value={segment}
            onChange={(v) => setSegment(v as string)}
          />
        </div>

        {/* Note */}
        <div className="p-4 bg-muted rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Primary navigation</strong> uses a top horizontal navbar (see Layout section). Menu design is a separate effort with its own responsive behavior (hamburger below 1024px).
          </p>
        </div>
      </div>
    </section>
  )
}
