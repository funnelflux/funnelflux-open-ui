import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Select as SelectPrimitive, Tag } from 'antd'
import type { SelectProps as AntdSelectProps } from 'antd'
import type { ControlSize } from '@/lib/controlSize'
import { controlSizeToAntdSize } from '@/lib/controlSize'
import { cn } from '@/lib/utils'

/**
 * Option row for {@link Select} / {@link SmartMultiSelect}.
 * Same shape as Ant Design `options` entries; supports optional `searchId` for extra match text.
 */
export interface SelectOption {
  label: string
  value: string
  /** Optional secondary search key (e.g. entity ID) */
  searchId?: string
}

const DISPLAY_LIMIT = 200

function useFilteredOptions(
  options: SelectOption[],
  searchValue: string,
  alphabetical: boolean,
) {
  return useMemo(() => {
    let list = options.filter(
      (o): o is SelectOption =>
        o != null &&
        typeof o.label === 'string' &&
        typeof o.value === 'string',
    )

    if (alphabetical) {
      list = [...list].sort((a, b) =>
        String(a.label).localeCompare(String(b.label), undefined, {
          sensitivity: 'base',
        }),
      )
    }

    const query = searchValue.toLowerCase().trim()
    if (query) {
      list = list.filter(
        (o) =>
          String(o.label).toLowerCase().includes(query) ||
          String(o.value).toLowerCase().includes(query) ||
          (o.searchId && String(o.searchId).toLowerCase().includes(query)),
      )
    }

    const total = list.length
    const capped = list.slice(0, DISPLAY_LIMIT)
    const overflow = total - capped.length

    return { items: capped, overflow, total }
  }, [options, searchValue, alphabetical])
}

export interface SelectProps extends Omit<AntdSelectProps, 'options' | 'filterOption'> {
  options: SelectOption[]
  /** Sort options alphabetically (default: true). Set false for ordered lists like timezone. */
  alphabetical?: boolean
  /** Default **md** (35px); pair with `controlSize` for toolbar alignment */
  controlSize?: ControlSize
}

/** Searchable single select with capped idle list; use everywhere in the app for consistent UX. */
export function Select({
  options,
  alphabetical = true,
  controlSize = 'md',
  size,
  ...rest
}: SelectProps) {
  const [search, setSearch] = useState('')
  const { items, overflow } = useFilteredOptions(options, search, alphabetical)

  const selectOptions = useMemo(() => {
    const mapped: { label: string; value: string; disabled?: boolean }[] =
      items.map((o) => ({ label: o.label, value: o.value }))
    if (overflow > 0) {
      mapped.push({
        label: `Type to search ${overflow} more...`,
        value: '__overflow__',
        disabled: true,
      })
    }
    return mapped
  }, [items, overflow])

  return (
    <SelectPrimitive
      showSearch
      filterOption={false}
      onSearch={setSearch}
      onOpenChange={(open) => { if (!open) setSearch('') }}
      size={size ?? controlSizeToAntdSize(controlSize)}
      options={selectOptions}
      optionRender={(option) => {
        if (option.value === '__overflow__') {
          return (
            <span className="text-xs text-muted-foreground italic">
              {option.label}
            </span>
          )
        }
        return option.label
      }}
      {...rest}
    />
  )
}

interface SmartMultiSelectProps extends Omit<AntdSelectProps<string[]>, 'options' | 'filterOption' | 'mode'> {
  options: SelectOption[]
  alphabetical?: boolean
  maxTagCount?: number
  controlSize?: ControlSize
}

export function SmartMultiSelect({
  options,
  alphabetical = true,
  maxTagCount = 3,
  controlSize = 'md',
  size,
  ...rest
}: SmartMultiSelectProps) {
  const [search, setSearch] = useState('')
  const { items, overflow } = useFilteredOptions(options, search, alphabetical)

  const selectOptions = useMemo(() => {
    const mapped: { label: string; value: string; disabled?: boolean }[] =
      items.map((o) => ({ label: o.label, value: o.value }))
    if (overflow > 0) {
      mapped.push({
        label: `Type to search ${overflow} more...`,
        value: '__overflow__',
        disabled: true,
      })
    }
    return mapped
  }, [items, overflow])

  return (
    <SelectPrimitive
      mode="multiple"
      showSearch
      filterOption={false}
      onSearch={setSearch}
      onOpenChange={(open) => { if (!open) setSearch('') }}
      size={size ?? controlSizeToAntdSize(controlSize)}
      options={selectOptions}
      maxTagCount={maxTagCount}
      maxTagPlaceholder={(omitted) => (
        <Tag className="m-0">+{omitted.length}</Tag>
      )}
      optionRender={(option) => {
        if (option.value === '__overflow__') {
          return (
            <span className="text-xs text-muted-foreground italic">
              {option.label}
            </span>
          )
        }
        return option.label
      }}
      {...rest}
    />
  )
}

/** Full-list filter (no row cap); relies on Ant Design Select virtual list for large option sets. */
function filterFullOptions(
  options: SelectOption[],
  searchValue: string,
  alphabetical: boolean,
): SelectOption[] {
  let list = options.filter(
    (o): o is SelectOption =>
      o != null &&
      typeof o.label === 'string' &&
      typeof o.value === 'string',
  )

  if (alphabetical) {
    list = [...list].sort((a, b) =>
      String(a.label).localeCompare(String(b.label), undefined, {
        sensitivity: 'base',
      }),
    )
  }

  const query = searchValue.toLowerCase().trim()
  if (query) {
    list = list.filter(
      (o) =>
        String(o.label).toLowerCase().includes(query) ||
        String(o.value).toLowerCase().includes(query) ||
        (o.searchId && String(o.searchId).toLowerCase().includes(query)),
    )
  }

  return list
}

function mergeSelectedIntoDropdownOptions(
  allOptions: SelectOption[],
  filtered: SelectOption[],
  selectedValues: string[],
): { label: string; value: string }[] {
  const byVal = new Map(allOptions.map((o) => [o.value, o]))
  const inFiltered = new Set(filtered.map((o) => o.value))
  const extras: SelectOption[] = []
  for (const v of selectedValues) {
    if (!inFiltered.has(v)) {
      const o = byVal.get(v)
      extras.push(o ?? { label: v, value: v, searchId: v })
    }
  }
  return [...extras, ...filtered].map((o) => ({ label: o.label, value: o.value }))
}

export interface VirtualizedMultiSelectProps
  extends Omit<AntdSelectProps<string[]>, 'options' | 'filterOption' | 'mode'> {
  options: SelectOption[]
  /** Sort options alphabetically (default: true). */
  alphabetical?: boolean
  maxTagCount?: number
  controlSize?: ControlSize
  /** Viewport height of the dropdown list in px (virtualized). */
  listHeight?: number
}

/**
 * Multi-select with client-side search over the **full** `options` array and a virtualized dropdown
 * (antd/rc-select). Selected values stay visible as tags even when filtered out of the current search.
 */
export function VirtualizedMultiSelect({
  options,
  alphabetical = true,
  maxTagCount = 3,
  controlSize = 'md',
  size,
  listHeight = 280,
  value,
  onOpenChange,
  className,
  ...rest
}: VirtualizedMultiSelectProps) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(
    () => filterFullOptions(options, search, alphabetical),
    [alphabetical, options, search],
  )

  const selectedValues = useMemo(() => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : []
  }, [value])

  const selectOptions = useMemo(
    () => mergeSelectedIntoDropdownOptions(options, filtered, selectedValues),
    [filtered, options, selectedValues],
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setSearch('')
      onOpenChange?.(open)
    },
    [onOpenChange],
  )

  return (
    <SelectPrimitive
      mode="multiple"
      virtual
      listHeight={listHeight}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      onOpenChange={handleOpenChange}
      size={size ?? controlSizeToAntdSize(controlSize)}
      className={cn('w-full min-w-0', className)}
      options={selectOptions}
      maxTagCount={maxTagCount}
      maxTagPlaceholder={(omitted) => (
        <Tag className="m-0">+{omitted.length}</Tag>
      )}
      value={value}
      {...rest}
    />
  )
}

/** Grouped, searchable single select (Ant Design optgroups). Use for long taxonomies (e.g. drilldown groupings). */
export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

export interface GroupedSelectProps extends Omit<AntdSelectProps, 'options' | 'filterOption' | 'mode'> {
  optionGroups: SelectOptionGroup[]
  controlSize?: ControlSize
}

function defaultGroupedFilterOption(
  input: string,
  option:
    | {
        label?: ReactNode
        value?: string | number
        options?: Array<{ label?: ReactNode; value?: string | number }>
      }
    | undefined,
): boolean {
  const q = input.toLowerCase().trim()
  if (!q) return true
  if (!option) return false
  const children = option.options
  if (children?.length) {
    return children.some((child) => {
      const label = String(child.label ?? '').toLowerCase()
      const val = String(child.value ?? '').toLowerCase()
      return label.includes(q) || val.includes(q)
    })
  }
  const label = String(option.label ?? '').toLowerCase()
  const val = String(option.value ?? '').toLowerCase()
  return label.includes(q) || val.includes(q)
}

export function GroupedSelect({
  optionGroups,
  controlSize = 'md',
  size,
  showSearch = true,
  ...rest
}: GroupedSelectProps) {
  return (
    <SelectPrimitive
      showSearch={showSearch}
      filterOption={showSearch ? defaultGroupedFilterOption : false}
      size={size ?? controlSizeToAntdSize(controlSize)}
      options={optionGroups}
      {...rest}
    />
  )
}
