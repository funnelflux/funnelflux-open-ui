import { renderHook } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  listToggleableColumns,
  useEntityGridColumnVisibility,
} from './entityGridColumnVisibility'

const columns = [
  { id: 'select', header: '' },
  { id: 'name', header: 'Name' },
  { id: 'visits', header: 'Visits' },
  { id: 'revenue', header: 'Revenue' },
  { id: 'btn_edit', header: '' },
] as ColumnDef<unknown, unknown>[]

describe('entityGridColumnVisibility', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists only user-toggleable columns', () => {
    expect(listToggleableColumns(columns)).toEqual([
      { id: 'visits', headerName: 'Visits' },
      { id: 'revenue', headerName: 'Revenue' },
    ])
  })

  it('uses first-visit defaults when localStorage has no stored hidden columns', () => {
    const { result } = renderHook(() =>
      useEntityGridColumnVisibility(columns, 'test-grid', {
        defaultVisibleColumnIds: ['name', 'visits'],
      }),
    )

    expect(result.current.columnVisibility.visits).toBe(true)
    expect(result.current.columnVisibility.revenue).toBe(false)
  })

  it('reads persisted hidden columns from ff_columns storage', () => {
    localStorage.setItem('ff_columns_test-grid', JSON.stringify(['visits']))

    const { result } = renderHook(() =>
      useEntityGridColumnVisibility(columns, 'test-grid', {
        defaultVisibleColumnIds: ['name', 'visits', 'revenue'],
      }),
    )

    expect(result.current.columnVisibility.visits).toBe(false)
    expect(result.current.columnVisibility.revenue).toBe(true)
  })

  it('persists hidden columns when selected columns change', () => {
    const { result } = renderHook(() =>
      useEntityGridColumnVisibility(columns, 'test-grid', {
        defaultVisibleColumnIds: ['name', 'visits', 'revenue'],
      }),
    )

    result.current.onColumnsChange(new Set(['name', 'revenue']))

    expect(JSON.parse(localStorage.getItem('ff_columns_test-grid') ?? '[]')).toContain('visits')
  })
})
