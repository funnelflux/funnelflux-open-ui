import { GroupingFilterPopover } from "@/components/drilldown/GroupingFilterPopover"
import { Plus, X } from "lucide-react"
import { AntdSelect, Button } from "@/components/ui-kit"

const MAX_LEVELS = 4

interface GroupingsCascadeProps {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  availableGroupings: string[]
  onChange: (groupings: string[]) => void
  onFilterChange: (level: number, next: { whitelist: string[]; blacklist: string[] }) => void
}

export function GroupingsCascade({
  groupings,
  groupingFilters,
  availableGroupings,
  onChange,
  onFilterChange,
}: GroupingsCascadeProps) {
  const handleChange = (index: number, value: string) => {
    const next = [...groupings]
    next[index] = value
    onChange(next)
  }

  const handleAdd = () => {
    if (groupings.length >= MAX_LEVELS) return
    // Pick the first available grouping not already selected
    const used = new Set(groupings)
    const nextOption = availableGroupings.find((g) => !used.has(g))
    if (nextOption) {
      onChange([...groupings, nextOption])
    }
  }

  const handleRemove = (index: number) => {
    // Remove this level and all subsequent levels
    onChange(groupings.slice(0, index))
  }

  // Compute which options are already used at other levels
  const usedAtOtherLevels = (currentIndex: number) => {
    const used = new Set(groupings)
    used.delete(groupings[currentIndex])
    return used
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {groupings.map((grouping, index) => {
        const used = usedAtOtherLevels(index)
        return (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && (
              <span className="text-xs text-muted-foreground mx-0.5">&gt;</span>
            )}
            <AntdSelect
              value={grouping || undefined}
              onChange={(v) => handleChange(index, v)}
              placeholder="Select grouping"
              size="middle"
              className="w-[200px] text-xs"
              options={availableGroupings
                .filter((g) => !used.has(g))
                .map((g) => ({
                  key: g,
                  value: g,
                  label: g,
                }))}
            />
            <GroupingFilterPopover
              grouping={grouping}
              filters={groupingFilters[index] ?? { whitelist: [], blacklist: [] }}
              onApply={(next) => onFilterChange(index, next)}
            />
            {index > 0 && (
              <Button
                type="text"
                className="h-[35px] w-8 min-w-8 px-0"
                icon={<X className="h-3.5 w-3.5" />}
                onClick={() => handleRemove(index)}
                aria-label="Remove grouping"
              />
            )}
          </div>
        )
      })}

      {groupings.length < MAX_LEVELS && groupings.length < availableGroupings.length && (
        <Button
          className="text-xs"
          onClick={handleAdd}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          Add level
        </Button>
      )}
    </div>
  )
}
