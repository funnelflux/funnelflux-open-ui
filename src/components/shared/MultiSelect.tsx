import { useState, useMemo, useRef } from "react"
import { useCombobox, useMultipleSelection } from "downshift"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Icon } from '@/components/ui-kit/icons'
import { cn } from "@/lib/utils"
import { Tag } from "@/components/ui-kit"

export interface MultiSelectOption {
  value: string
  label: string
  group?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchable?: boolean
  maxDisplayChips?: number
  className?: string
}

type VirtualRow =
  | { type: "group"; label: string }
  | { type: "option"; option: MultiSelectOption }

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchable = true,
  maxDisplayChips = 5,
  className,
}: MultiSelectProps) {
  const [inputValue, setInputValue] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  const selectedSet = useMemo(() => new Set(value), [value])

  const filteredRows = useMemo(() => {
    const query = inputValue.toLowerCase()
    const filtered = query
      ? options.filter((o) => o.label.toLowerCase().includes(query))
      : options

    // Group items
    const groups = new Map<string, MultiSelectOption[]>()
    const ungrouped: MultiSelectOption[] = []
    for (const opt of filtered) {
      if (opt.group) {
        if (!groups.has(opt.group)) groups.set(opt.group, [])
        groups.get(opt.group)!.push(opt)
      } else {
        ungrouped.push(opt)
      }
    }

    const rows: VirtualRow[] = []
    for (const [group, items] of groups) {
      rows.push({ type: "group", label: group })
      for (const item of items) {
        rows.push({ type: "option", option: item })
      }
    }
    for (const item of ungrouped) {
      rows.push({ type: "option", option: item })
    }
    return rows
  }, [options, inputValue])

  const filteredOptions = useMemo(
    () =>
      filteredRows
        .filter((r): r is Extract<VirtualRow, { type: "option" }> => r.type === "option")
        .map((r) => r.option),
    [filteredRows],
  )

  const { getSelectedItemProps, getDropdownProps, removeSelectedItem } =
    useMultipleSelection({
      selectedItems: value,
      onStateChange({ selectedItems: newSelected, type }) {
        switch (type) {
          case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
          case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
            onChange(newSelected ?? [])
            break
        }
      },
    })

  const {
    isOpen,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
  } = useCombobox({
    items: filteredOptions,
    inputValue,
    selectedItem: null,
    stateReducer(_state, actionAndChanges) {
      const { changes, type } = actionAndChanges
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          return { ...changes, isOpen: true, inputValue: "" }
        default:
          return changes
      }
    },
    onStateChange({ inputValue: newInput, type, selectedItem: newSelected }) {
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
        case useCombobox.stateChangeTypes.InputBlur:
          if (newSelected) {
            if (selectedSet.has(newSelected.value)) {
              onChange(value.filter((v) => v !== newSelected.value))
            } else {
              onChange([...value, newSelected.value])
            }
          }
          break
        case useCombobox.stateChangeTypes.InputChange:
          setInputValue(newInput ?? "")
          break
      }
    },
  })

  // TanStack Virtual exposes methods on the returned virtualizer instance;
  // React Compiler cannot safely memoize it, but this direct usage is expected.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) => (filteredRows[index].type === "group" ? 28 : 32),
    overscan: 5,
  })

  // Map option index in filteredOptions to its row index
  const optionToRowIndex = useMemo(() => {
    const map = new Map<number, number>()
    let optIdx = 0
    for (let i = 0; i < filteredRows.length; i++) {
      if (filteredRows[i].type === "option") {
        map.set(optIdx, i)
        optIdx++
      }
    }
    return map
  }, [filteredRows])

  const rowToOptionIndex = useMemo(() => {
    const map = new Map<number, number>()
    let optIdx = 0
    for (let i = 0; i < filteredRows.length; i++) {
      if (filteredRows[i].type === "option") {
        map.set(i, optIdx)
        optIdx++
      }
    }
    return map
  }, [filteredRows])

  const handleSelectAll = () => {
    const allVals = new Set(value)
    for (const opt of filteredOptions) allVals.add(opt.value)
    onChange([...allVals])
  }

  const handleClearAll = () => {
    const filterSet = new Set(filteredOptions.map((o) => o.value))
    onChange(value.filter((v) => !filterSet.has(v)))
  }

  const selectedLabels = useMemo(() => {
    const labelMap = new Map(options.map((o) => [o.value, o.label]))
    return value.map((v) => ({ value: v, label: labelMap.get(v) || v }))
  }, [options, value])

  const displayChips = selectedLabels.slice(0, maxDisplayChips)
  const overflowCount = selectedLabels.length - maxDisplayChips

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm min-h-9",
          isOpen && "ring-2 ring-ring ring-offset-1",
        )}
      >
        {displayChips.map((item, index) => (
          <span
            key={item.value}
            className="inline-flex items-center gap-1 text-xs rounded bg-muted px-1.5 py-0.5"
            {...getSelectedItemProps({ selectedItem: item.value, index })}
          >
            {item.label}
            <button
              type="button"
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.stopPropagation()
                removeSelectedItem(item.value)
              }}
            >
              <Icon name="x" size="sm" />
            </button>
          </span>
        ))}
        {overflowCount > 0 && (
          <Tag className="text-xs">
            +{overflowCount} more
          </Tag>
        )}
        {searchable && (
          <input
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            placeholder={value.length === 0 ? placeholder : ""}
            {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
          />
        )}
        <button
          type="button"
          className="ml-auto shrink-0 text-muted-foreground"
          {...getToggleButtonProps()}
          aria-label="toggle menu"
        >
          <Icon name="chevrons-up-down" size="md" />
        </button>
      </div>

      <div
        className={cn(
          "absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md",
          !isOpen && "hidden",
        )}
      >
        {filteredOptions.length > 0 && (
          <div className="flex gap-1 p-1.5 border-b">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <span className="text-xs text-muted-foreground">/</span>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={handleClearAll}
            >
              Clear All
            </button>
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredOptions.length} items
            </span>
          </div>
        )}
        <div
          ref={listRef}
          className="max-h-[240px] overflow-auto"
          {...getMenuProps()}
        >
          {isOpen && (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
                width: "100%",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = filteredRows[virtualRow.index]

                if (row.type === "group") {
                  return (
                    <div
                      key={`group-${row.label}`}
                      className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.label}
                    </div>
                  )
                }

                const optIndex = rowToOptionIndex.get(virtualRow.index) ?? 0
                const isSelected = selectedSet.has(row.option.value)
                const isHighlighted =
                  highlightedIndex >= 0 &&
                  optionToRowIndex.get(highlightedIndex) === virtualRow.index

                return (
                  <div
                    key={row.option.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer",
                      isHighlighted && "bg-accent text-accent-foreground",
                      isSelected && !isHighlighted && "bg-accent/50",
                    )}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    {...getItemProps({ item: row.option, index: optIndex })}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isSelected && <Icon name="check" size="sm" />}
                    </div>
                    <span className="truncate">{row.option.label}</span>
                  </div>
                )
              })}
            </div>
          )}
          {isOpen && filteredRows.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
