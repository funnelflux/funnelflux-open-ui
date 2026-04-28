import { Icon } from '@/components/ui-kit/icons'
import { Button } from '@/components/ui-kit'
import { useThemeStore } from '@/store/theme'
import { ColorsSection } from './sections/ColorsSection'
import { TypographySection } from './sections/TypographySection'
import { SpacingSection } from './sections/SpacingSection'
import { ButtonsSection } from './sections/ButtonsSection'
import { FormsSection } from './sections/FormsSection'
import { SelectsSection } from './sections/SelectsSection'
import { FeedbackSection } from './sections/FeedbackSection'
import { DataDisplaySection } from './sections/DataDisplaySection'
import { OverlaysSection } from './sections/OverlaysSection'
import { NavigationSection } from './sections/NavigationSection'
import { TablesSection } from './sections/TablesSection'
import { ChartsSection } from './sections/ChartsSection'
import { LayoutSection } from './sections/LayoutSection'
import { CachingSection } from './sections/CachingSection'

const sections = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'selects', label: 'Selects' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'data-display', label: 'Data Display' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'tables', label: 'Tables' },
  { id: 'charts', label: 'Charts' },
  { id: 'layout', label: 'Layout' },
  { id: 'caching', label: 'Caching' },
]

export function DesignSystemPage() {
  const { mode, toggle } = useThemeStore()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-border bg-surface sticky top-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-sm font-semibold text-foreground">Design System</h1>
          <p className="text-xs text-muted-foreground mt-0.5">FunnelFlux UI Kit</p>
        </div>
        <nav className="p-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="p-3 border-t border-border mt-2">
          <p className="text-[10px] text-muted-foreground">
            Fonts and colors are configurable via <code className="bg-muted px-1 rounded">design-tokens.css</code> and <code className="bg-muted px-1 rounded">antd-theme.ts</code>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar with theme toggle */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border px-8 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Theme: <span className="font-medium text-foreground">{mode === 'light' ? 'Light' : 'Dark'}</span>
          </span>
          <Button
            type="text"
            icon={mode === 'light' ? <Icon name="moon" className="h-4 w-4" /> : <Icon name="sun" className="h-4 w-4" />}
            onClick={toggle}
          >
            Toggle {mode === 'light' ? 'Dark' : 'Light'}
          </Button>
        </div>

        {/* Sections */}
        <div className="p-8 space-y-16 max-w-5xl">
          <ColorsSection />
          <TypographySection />
          <SpacingSection />
          <ButtonsSection />
          <FormsSection />
          <SelectsSection />
          <FeedbackSection />
          <DataDisplaySection />
          <OverlaysSection />
          <NavigationSection />
          <TablesSection />
          <ChartsSection />
          <LayoutSection />
          <CachingSection />
        </div>
      </main>
    </div>
  )
}
