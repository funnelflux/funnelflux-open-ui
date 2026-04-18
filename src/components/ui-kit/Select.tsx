import { useMemo, useState } from 'react'
import { Select as AntdSelect, Tag } from 'antd'
import type { SelectProps as AntdSelectProps } from 'antd'
import type { ControlSize } from '@/lib/controlSize'
import { controlSizeToAntdSize } from '@/lib/controlSize'

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
    <AntdSelect
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
    <AntdSelect
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

/** Raw Ant Design `Select` (e.g. `Select.Option` children). Prefer the {@link Select} export above for normal dropdowns. */
export { AntdSelect }
export type { AntdSelectProps }
