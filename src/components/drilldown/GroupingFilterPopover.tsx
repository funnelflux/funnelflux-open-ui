import { useEffect, useMemo, useState } from "react"
import { Filter } from "lucide-react"
import { Button, Input, Popover, Tabs } from "antd"
import { cn } from "@/lib/utils"

interface GroupingFilterPopoverProps {
  grouping: string
  filters: { whitelist: string[]; blacklist: string[] }
  onApply: (next: { whitelist: string[]; blacklist: string[] }) => void
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

export function GroupingFilterPopover({
  grouping,
  filters,
  onApply,
}: GroupingFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"whitelist" | "blacklist">("whitelist")
  const [whitelistInput, setWhitelistInput] = useState("")
  const [blacklistInput, setBlacklistInput] = useState("")

  useEffect(() => {
    setWhitelistInput(stringifyValues(filters.whitelist))
    setBlacklistInput(stringifyValues(filters.blacklist))
  }, [filters])

  const isActive = useMemo(
    () => filters.whitelist.length > 0 || filters.blacklist.length > 0,
    [filters.blacklist.length, filters.whitelist.length],
  )

  const handleApply = () => {
    onApply({
      whitelist: parseValues(whitelistInput),
      blacklist: parseValues(blacklistInput),
    })
    setOpen(false)
  }

  const handleClear = () => {
    setWhitelistInput("")
    setBlacklistInput("")
    onApply({ whitelist: [], blacklist: [] })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className="w-80 space-y-3">
          <div>
            <p className="text-sm font-medium">{grouping}</p>
            <p className="text-xs text-muted-foreground">
              Enter one value per line or separate values with commas.
            </p>
          </div>

          <Tabs
            activeKey={tab}
            onChange={(key) => setTab(key as "whitelist" | "blacklist")}
            items={[
              {
                key: "whitelist",
                label: "Whitelist",
                children: (
                  <Input.TextArea
                    value={whitelistInput}
                    onChange={(event) => setWhitelistInput(event.target.value)}
                    placeholder={"123\n456\nUS"}
                    className="min-h-[140px] text-xs"
                  />
                ),
              },
              {
                key: "blacklist",
                label: "Blacklist",
                children: (
                  <Input.TextArea
                    value={blacklistInput}
                    onChange={(event) => setBlacklistInput(event.target.value)}
                    placeholder={"bot\ntest"}
                    className="min-h-[140px] text-xs"
                  />
                ),
              },
            ]}
          />

          <div className="flex justify-end gap-2">
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
        className={cn("relative h-7 w-7", isActive && "text-foreground")}
        icon={<Filter className="h-3.5 w-3.5" />}
      >
        {isActive ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        ) : null}
        <span className="sr-only">Filter {grouping}</span>
      </Button>
    </Popover>
  )
}
