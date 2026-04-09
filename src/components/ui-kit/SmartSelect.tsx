import { useMemo, useState } from 'react'
import { Select, Tag } from 'antd'
import type { SelectProps } from 'antd'

/**
 * DISPLAY_LIMIT: max items rendered in the dropdown before showing
 * "Type to search N more..." indicator. Prevents DOM thrash on huge lists.
 * Matching items always surface on type -- the cap only applies to idle state.
 */
const DISPLAY_LIMIT = 200

export interface SmartSelectOption {
  label: string
  value: string
  /** Optional secondary search key (e.g. entity ID) */
  searchId?: string
}

/* ──────────────────────────────────────────────
   Shared logic: filter + cap + sort
   ────────────────────────────────────────────── */

function useFilteredOptions(
  options: SmartSelectOption[],
  searchValue: string,
  alphabetical: boolean,
) {
  return useMemo(() => {
    let list = options

    // Sort alphabetically if requested (timezone-style lists pass false)
    if (alphabetical) {
      list = [...list].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
      )
    }

    // Filter on search
    const query = searchValue.toLowerCase().trim()
    if (query) {
      list = list.filter(
        (o) =>
          o.label.toLowerCase().includes(query) ||
          o.value.toLowerCase().includes(query) ||
          (o.searchId && o.searchId.toLowerCase().includes(query)),
      )
    }

    const total = list.length
    const capped = list.slice(0, DISPLAY_LIMIT)
    const overflow = total - capped.length

    return { items: capped, overflow, total }
  }, [options, searchValue, alphabetical])
}

/* ──────────────────────────────────────────────
   SmartSelect — single select
   ────────────────────────────────────────────── */

interface SmartSelectProps extends Omit<SelectProps, 'options' | 'filterOption'> {
  options: SmartSelectOption[]
  /** Sort options alphabetically (default: true). Set false for ordered lists like timezone. */
  alphabetical?: boolean
}

export function SmartSelect({
  options,
  alphabetical = true,
  ...rest
}: SmartSelectProps) {
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
    <Select
      showSearch
      filterOption={false}
      onSearch={setSearch}
      onOpenChange={(open) => { if (!open) setSearch('') }}
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

/* ──────────────────────────────────────────────
   SmartMultiSelect — multi select with capsules
   ────────────────────────────────────────────── */

interface SmartMultiSelectProps extends Omit<SelectProps<string[]>, 'options' | 'filterOption' | 'mode'> {
  options: SmartSelectOption[]
  alphabetical?: boolean
  /** Max capsules to show before +N (default: 3) */
  maxTagCount?: number
}

export function SmartMultiSelect({
  options,
  alphabetical = true,
  maxTagCount = 3,
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
    <Select
      mode="multiple"
      showSearch
      filterOption={false}
      onSearch={setSearch}
      onOpenChange={(open) => { if (!open) setSearch('') }}
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
