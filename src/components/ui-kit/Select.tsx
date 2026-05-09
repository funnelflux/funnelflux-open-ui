import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Select as SelectPrimitive, Tag } from 'antd'
import type { SelectProps as AntdSelectProps } from 'antd'
import type { ControlSize, LegacyAntdControlSize } from '@/lib/controlSize'
import { controlTierToAntdSize } from '@/lib/controlSize'
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

/** Synthetic dropdown value for “Select All” in {@link VirtualizedMultiSelect}. */
const VIRTUAL_MULTI_ROW_SELECT_ALL = '__ff_vm_select_all__'
/** Synthetic dropdown value for “Deselect All” in {@link VirtualizedMultiSelect}. */
const VIRTUAL_MULTI_ROW_DESELECT_ALL = '__ff_vm_deselect_all__'

const virtualMultiBulkSentinels = new Set([
  VIRTUAL_MULTI_ROW_SELECT_ALL,
  VIRTUAL_MULTI_ROW_DESELECT_ALL,
])

function useFilteredOptions(
  options: SelectOption[],
  searchValue: string,
  alphabetical: boolean,
) {
  return useMemo(() => {
    let list = options.filter(
      (option): option is SelectOption =>
        option != null &&
        typeof option.label === 'string' &&
        typeof option.value === 'string',
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
        (option) =>
          String(option.label).toLowerCase().includes(query) ||
          String(option.value).toLowerCase().includes(query) ||
          (option.searchId && String(option.searchId).toLowerCase().includes(query)),
      )
    }

    const total = list.length
    const capped = list.slice(0, DISPLAY_LIMIT)
    const overflow = total - capped.length

    return { items: capped, overflow, total }
  }, [options, searchValue, alphabetical])
}

/** sm | md | lg (aligns with Button / Input); Ant Design small|middle|large map to the same tiers */
export type UiSelectSize = ControlSize | LegacyAntdControlSize

export interface SelectProps extends Omit<AntdSelectProps, 'options' | 'filterOption' | 'size'> {
  options: SelectOption[]
  /** Sort options alphabetically (default: true). Set false for ordered lists like timezone. */
  alphabetical?: boolean
  /** Default **md** */
  size?: UiSelectSize
}

/** Searchable single select with capped idle list; use everywhere in the app for consistent UX. */
export function Select({
  options,
  alphabetical = true,
  size = 'md',
  ...rest
}: SelectProps) {
  const [search, setSearch] = useState('')
  const { items, overflow } = useFilteredOptions(options, search, alphabetical)

  const selectOptions = useMemo(() => {
    const mapped: { label: string; value: string; disabled?: boolean }[] =
      items.map((option) => ({ label: option.label, value: option.value }))
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
      size={controlTierToAntdSize(size)}
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

interface SmartMultiSelectProps extends Omit<AntdSelectProps<string[]>, 'options' | 'filterOption' | 'mode' | 'size'> {
  options: SelectOption[]
  alphabetical?: boolean
  maxTagCount?: number
  size?: UiSelectSize
}

export function SmartMultiSelect({
  options,
  alphabetical = true,
  maxTagCount = 3,
  size = 'md',
  ...rest
}: SmartMultiSelectProps) {
  const [search, setSearch] = useState('')
  const { items, overflow } = useFilteredOptions(options, search, alphabetical)

  const selectOptions = useMemo(() => {
    const mapped: { label: string; value: string; disabled?: boolean }[] =
      items.map((option) => ({ label: option.label, value: option.value }))
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
      size={controlTierToAntdSize(size)}
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
    (option): option is SelectOption =>
      option != null &&
      typeof option.label === 'string' &&
      typeof option.value === 'string',
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
      (option) =>
        String(option.label).toLowerCase().includes(query) ||
        String(option.value).toLowerCase().includes(query) ||
        (option.searchId && String(option.searchId).toLowerCase().includes(query)),
    )
  }

  return list
}

function mergeSelectedIntoDropdownOptions(
  allOptions: SelectOption[],
  filtered: SelectOption[],
  selectedValues: string[],
): { label: string; value: string }[] {
  const optionsByValue = new Map(allOptions.map((option) => [option.value, option]))
  const inFiltered = new Set(filtered.map((option) => option.value))
  const extras: SelectOption[] = []
  for (const selectedValue of selectedValues) {
    if (!inFiltered.has(selectedValue)) {
      const knownOption = optionsByValue.get(selectedValue)
      extras.push(
        knownOption ?? { label: selectedValue, value: selectedValue, searchId: selectedValue },
      )
    }
  }
  return [...extras, ...filtered].map((option) => ({ label: option.label, value: option.value }))
}

export interface VirtualizedMultiSelectProps
  extends Omit<AntdSelectProps<string[]>, 'options' | 'filterOption' | 'mode' | 'size'> {
  options: SelectOption[]
  alphabetical?: boolean
  maxTagCount?: number
  size?: UiSelectSize
  listHeight?: number
  /** Prepends one bulk row: **Select All** when not everything is chosen, otherwise **Deselect All**. */
  selectAll?: boolean
}

function mergeSelectedSingleIntoDropdownOptions(
  allOptions: SelectOption[],
  filtered: SelectOption[],
  selected: string | null | undefined,
): { label: string; value: string }[] {
  const mapped = filtered.map((option) => ({ label: option.label, value: option.value }))
  if (selected == null || selected === '') return mapped
  const inFiltered = filtered.some((option) => option.value === selected)
  if (inFiltered) return mapped
  const selectedOption = allOptions.find((option) => option.value === selected)
  const extra = selectedOption ?? { label: selected, value: selected, searchId: selected }
  return [{ label: extra.label, value: extra.value }, ...mapped]
}

export interface VirtualizedSelectProps
  extends Omit<AntdSelectProps, 'options' | 'filterOption' | 'mode' | 'size'> {
  options: SelectOption[]
  alphabetical?: boolean
  size?: UiSelectSize
  listHeight?: number
  /** When true, the dropdown stays empty until the user types (search-first UX for huge lists). */
  blockOptionsUntilSearch?: boolean
}

/**
 * Single-select with client-side search over the full `options` array and a virtualized dropdown.
 */
export function VirtualizedSelect({
  options,
  alphabetical = true,
  size = 'md',
  listHeight = 280,
  blockOptionsUntilSearch = false,
  value,
  onOpenChange,
  onSearch: onSearchProp,
  className,
  ...rest
}: VirtualizedSelectProps) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (blockOptionsUntilSearch && !search.trim()) return []
    return filterFullOptions(options, search, alphabetical)
  }, [alphabetical, blockOptionsUntilSearch, options, search])

  const selectOptions = useMemo(
    () => mergeSelectedSingleIntoDropdownOptions(options, filtered, value as string | undefined),
    [filtered, options, value],
  )

  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q)
      onSearchProp?.(q)
    },
    [onSearchProp],
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
      virtual
      listHeight={listHeight}
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      onOpenChange={handleOpenChange}
      size={controlTierToAntdSize(size)}
      className={cn('w-full min-w-0', className)}
      options={selectOptions}
      value={value}
      {...rest}
    />
  )
}

export function VirtualizedMultiSelect({
  options,
  alphabetical = true,
  maxTagCount = 3,
  selectAll = false,
  size = 'md',
  listHeight = 280,
  value,
  onOpenChange,
  className,
  onChange: onChangeProp,
  ...rest
}: VirtualizedMultiSelectProps) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(
    () => filterFullOptions(options, search, alphabetical),
    [alphabetical, options, search],
  )

  const allValues = useMemo(
    () => options.map((o) => String(o?.value ?? '')).filter(Boolean),
    [options],
  )

  const selectedValues = useMemo(() => {
    if (value === undefined || value === null) return []
    return Array.isArray(value) ? value : []
  }, [value])

  const selectedForMerge = useMemo(
    () => selectedValues.filter((v) => !virtualMultiBulkSentinels.has(v)),
    [selectedValues],
  )

  const allOptionsSelected = useMemo(() => {
    if (allValues.length === 0) return false
    const selected = new Set(selectedForMerge)
    return allValues.every((id) => selected.has(id))
  }, [allValues, selectedForMerge])

  const selectOptions = useMemo(() => {
    const merged = mergeSelectedIntoDropdownOptions(options, filtered, selectedForMerge)
    if (!selectAll || allValues.length === 0) return merged
    const bulk = allOptionsSelected
      ? { label: 'Deselect All', value: VIRTUAL_MULTI_ROW_DESELECT_ALL }
      : { label: 'Select All', value: VIRTUAL_MULTI_ROW_SELECT_ALL }
    return [bulk, ...merged]
  }, [allOptionsSelected, allValues.length, filtered, options, selectAll, selectedForMerge])

  const handleChange = useCallback(
    (next: string[]) => {
      if (selectAll && next.includes(VIRTUAL_MULTI_ROW_DESELECT_ALL)) {
        onChangeProp?.([])
        return
      }
      if (selectAll && next.includes(VIRTUAL_MULTI_ROW_SELECT_ALL)) {
        onChangeProp?.([...allValues])
        return
      }
      onChangeProp?.(next.filter((v) => !virtualMultiBulkSentinels.has(v)))
    },
    [selectAll, allValues, onChangeProp],
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
      {...rest}
      mode="multiple"
      virtual
      listHeight={listHeight}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      onOpenChange={handleOpenChange}
      size={controlTierToAntdSize(size)}
      className={cn('w-full min-w-0', className)}
      options={selectOptions}
      maxTagCount={maxTagCount}
      maxTagPlaceholder={(omitted) => (
        <Tag className="m-0">+{omitted.length}</Tag>
      )}
      value={value}
      onChange={handleChange}
    />
  )
}

/** Grouped, searchable single select (Ant Design optgroups). Use for long taxonomies (e.g. drilldown groupings). */
export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

export interface GroupedSelectProps extends Omit<AntdSelectProps, 'options' | 'filterOption' | 'mode' | 'size'> {
  optionGroups: SelectOptionGroup[]
  size?: UiSelectSize
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
  size = 'md',
  showSearch = true,
  ...rest
}: GroupedSelectProps) {
  return (
    <SelectPrimitive
      showSearch={showSearch}
      filterOption={showSearch ? defaultGroupedFilterOption : false}
      size={controlTierToAntdSize(size)}
      options={optionGroups}
      {...rest}
    />
  )
}
