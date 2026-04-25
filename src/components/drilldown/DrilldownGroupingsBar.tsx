import { useMemo } from 'react'
import { GroupingsLevelsEditor } from '@/components/drilldown/GroupingsLevelsEditor'
import { Drawer, Tag } from '@/components/ui-kit'
import { drilldownGroupingShortLabel } from '@/lib/drilldownGroupings'
import { cn } from '@/lib/utils'

interface DrilldownGroupingsBarProps {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  availableGroupings: string[]
  onGroupingsChange: (next: string[]) => void
  onReplaceStack: (
    nextGroupings: string[],
    nextFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
  ) => void
  onFilterChange: (level: number, next: { whitelist: string[]; blacklist: string[] }) => void
  drawerOpen: boolean
  onCloseDrawer: () => void
}

function levelHasActiveFilters(
  filters: { whitelist: string[]; blacklist: string[] } | undefined,
): boolean {
  if (!filters) return false
  return filters.whitelist.length > 0 || filters.blacklist.length > 0
}

export function DrilldownGroupingsBar({
  groupings,
  groupingFilters,
  availableGroupings,
  onGroupingsChange,
  onReplaceStack,
  onFilterChange,
  drawerOpen,
  onCloseDrawer,
}: DrilldownGroupingsBarProps) {
  const tagItems = useMemo(
    () =>
      groupings.map((g, i) => {
        const filled = Boolean(g.trim())
        const short = filled ? drilldownGroupingShortLabel(g) : `Level ${i + 1}`
        const filterOn = levelHasActiveFilters(groupingFilters[i])
        return { key: i, filled, label: short, filterOn }
      }),
    [groupingFilters, groupings],
  )

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 min-h-[2.25rem] min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Group by:</span>
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          {tagItems.map((item, i) => (
            <span key={item.key} className="inline-flex items-center gap-1.5 max-w-full">
              {i > 0 ? (
                <span className="text-muted-foreground text-xs select-none shrink-0" aria-hidden>
                  ›
                </span>
              ) : null}
              <Tag
                className={cn(
                  'm-0 text-xs max-w-[200px] truncate inline-flex items-center gap-1',
                  !item.filled && 'border-dashed border-border text-muted-foreground bg-transparent',
                )}
                title={item.label}
              >
                <span className="truncate">{item.filled ? item.label : `${item.label} — not set`}</span>
                {item.filterOn ? (
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary"
                    aria-label="Filters active"
                  />
                ) : null}
              </Tag>
            </span>
          ))}
        </div>
      </div>

      <Drawer
        title="Group by"
        placement="right"
        width={440}
        open={drawerOpen}
        onClose={onCloseDrawer}
        destroyOnClose={false}
      >
        <GroupingsLevelsEditor
          groupings={groupings}
          groupingFilters={groupingFilters}
          availableGroupings={availableGroupings}
          onGroupingsChange={onGroupingsChange}
          onReplaceStack={onReplaceStack}
          onFilterChange={onFilterChange}
        />
      </Drawer>
    </>
  )
}
