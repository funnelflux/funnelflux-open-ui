import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useGroupingFilterAssetOptions } from "@/api/hooks"
import { Button, Input, Popover, Tabs, VirtualizedMultiSelect } from "@/components/ui-kit"
import { drilldownGroupingShortLabel } from "@/lib/drilldownGroupings"
import { cn } from "@/lib/utils"

interface GroupingFilterPopoverProps {
  grouping: string
  filters: { whitelist: string[]; blacklist: string[] }
  onApply: (next: { whitelist: string[]; blacklist: string[] }) => void
  /** When true, filters are disabled until a grouping is selected for this level. */
  filterDisabled?: boolean
}

function parseValues(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function stringifyValues(values: string[]): string {
  return values.join("\n")
}

function mergeUniqueLists(a: string[], b: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of [...a, ...b]) {
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

const TEXTAREA_ROWS = 1

export function GroupingFilterPopover({
  grouping,
  filters,
  onApply,
  filterDisabled = false,
}: GroupingFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"whitelist" | "blacklist">("whitelist")
  const [whitelistInput, setWhitelistInput] = useState("")
  const [blacklistInput, setBlacklistInput] = useState("")
  const [whitelistAssets, setWhitelistAssets] = useState<string[]>([])
  const [blacklistAssets, setBlacklistAssets] = useState<string[]>([])

  const { options, isLoading, isAsset } = useGroupingFilterAssetOptions(grouping, open && !filterDisabled)

  const optionValueSet = useMemo(() => new Set(options.map((o) => o.value)), [options])

  useEffect(() => {
    if (!open) return

    if (!isAsset) {
      queueMicrotask(() => {
        setWhitelistInput(stringifyValues(filters.whitelist))
        setBlacklistInput(stringifyValues(filters.blacklist))
        setWhitelistAssets([])
        setBlacklistAssets([])
      })
      return
    }

    if (isLoading) return

    const split = (vals: string[]) => {
      const asset: string[] = []
      const manual: string[] = []
      for (const v of vals) {
        if (optionValueSet.has(v)) asset.push(v)
        else manual.push(v)
      }
      return { asset, manual: stringifyValues(manual) }
    }

    const w = split(filters.whitelist)
    const b = split(filters.blacklist)
    queueMicrotask(() => {
      setWhitelistAssets(w.asset)
      setWhitelistInput(w.manual)
      setBlacklistAssets(b.asset)
      setBlacklistInput(b.manual)
    })
  }, [open, grouping, filters, isAsset, isLoading, optionValueSet])

  const isActive = useMemo(
    () => filters.whitelist.length > 0 || filters.blacklist.length > 0,
    [filters.blacklist.length, filters.whitelist.length],
  )

  const titleLabel = useMemo(
    () => drilldownGroupingShortLabel(grouping) || "Grouping",
    [grouping],
  )

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (filterDisabled) return
      setOpen(next)
    },
    [filterDisabled],
  )

  const handleApply = useCallback(() => {
    if (isAsset) {
      onApply({
        whitelist: mergeUniqueLists(whitelistAssets, parseValues(whitelistInput)),
        blacklist: mergeUniqueLists(blacklistAssets, parseValues(blacklistInput)),
      })
    } else {
      onApply({
        whitelist: parseValues(whitelistInput),
        blacklist: parseValues(blacklistInput),
      })
    }
    setOpen(false)
  }, [
    blacklistAssets,
    blacklistInput,
    isAsset,
    onApply,
    whitelistAssets,
    whitelistInput,
  ])

  const handleClear = useCallback(() => {
    setWhitelistInput("")
    setBlacklistInput("")
    setWhitelistAssets([])
    setBlacklistAssets([])
    onApply({ whitelist: [], blacklist: [] })
    setOpen(false)
  }, [onApply])

  const handleTabChange = useCallback((key: string) => {
    setTab(key as "whitelist" | "blacklist")
  }, [])

  const handleWhitelistChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setWhitelistInput(event.target.value)
  }, [])

  const handleBlacklistChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setBlacklistInput(event.target.value)
  }, [])

  const handleWhitelistAssetsChange = useCallback((next: string[]) => {
    setWhitelistAssets(next)
  }, [])

  const handleBlacklistAssetsChange = useCallback((next: string[]) => {
    setBlacklistAssets(next)
  }, [])

  const introText = isAsset
    ? "Search and select items, or add extra values below (one per line or comma-separated)."
    : "Enter one value per line or separate values with commas."

  const tabItems = useMemo(
    () => [
      {
        key: "whitelist",
        label: "Whitelist",
        children: (
          <div className="w-full space-y-3">
            {isAsset ? (
              <VirtualizedMultiSelect
                allowClear
                loading={isLoading}
                options={options}
                placeholder={isLoading ? "Loading…" : "Search and select…"}
                value={whitelistAssets}
                onChange={handleWhitelistAssetsChange}
                maxTagCount={2}
                listHeight={288}
              />
            ) : null}
            <Input.TextArea
              value={whitelistInput}
              onChange={handleWhitelistChange}
              placeholder={"123\n456\nUS"}
              rows={TEXTAREA_ROWS}
              className="resize-none overflow-y-auto text-xs"
            />
          </div>
        ),
      },
      {
        key: "blacklist",
        label: "Blacklist",
        children: (
          <div className="w-full space-y-3">
            {isAsset ? (
              <VirtualizedMultiSelect
                allowClear
                loading={isLoading}
                options={options}
                placeholder={isLoading ? "Loading…" : "Search and select…"}
                value={blacklistAssets}
                onChange={handleBlacklistAssetsChange}
                maxTagCount={2}
                listHeight={288}
              />
            ) : null}
            <Input.TextArea
              value={blacklistInput}
              onChange={handleBlacklistChange}
              placeholder={"bot\ntest"}
              rows={TEXTAREA_ROWS}
              className="resize-none overflow-y-auto text-xs"
            />
          </div>
        ),
      },
    ],
    [
      blacklistAssets,
      blacklistInput,
      handleBlacklistAssetsChange,
      handleBlacklistChange,
      handleWhitelistAssetsChange,
      handleWhitelistChange,
      isAsset,
      isLoading,
      options,
      whitelistAssets,
      whitelistInput,
    ],
  )

  return (
    <Popover
      open={filterDisabled ? false : open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className="w-80 space-y-3">
          <div>
            <p className="text-sm font-medium">{titleLabel}</p>
            <p className="text-xs text-muted-foreground">{introText}</p>
          </div>

          <Tabs activeKey={tab} onChange={handleTabChange} items={tabItems} />

          <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
            <Button htmlType="button" size="small" onClick={handleClear}>
              Clear
            </Button>
            <Button htmlType="button" type="primary" size="small" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      }
    >
      <Button
        htmlType="button"
        type="text"
        disabled={filterDisabled}
        className={cn("relative h-[35px] w-8 min-w-8 px-0", isActive && "text-foreground")}
        iconName="filter"
        iconSize="sm"
      >
        {isActive ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        ) : null}
        <span className="sr-only">Filter {titleLabel}</span>
      </Button>
    </Popover>
  )
}
