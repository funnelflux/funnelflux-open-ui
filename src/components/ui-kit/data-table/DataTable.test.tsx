import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, selectionColumn } from './index'
import { selectTableConfig, useTableConfigStore } from '@/store/tableConfig'

type Row = { id: string; name: string; value: number }

const baseColumns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name', id: 'name' },
  { accessorKey: 'value', header: 'Value', id: 'value' },
]

type TreeRow = { id: string; name: string; children?: TreeRow[] }

const TABLE_KEY = 'datatable-contract-test'

describe('DataTable contracts', () => {
  beforeEach(() => {
    localStorage.removeItem('ff-table-configs')
    useTableConfigStore.setState({ configs: {} })
  })

  it('client sorting reorders rows when header is toggled', async () => {
    const user = userEvent.setup()
    const data: Row[] = [
      { id: '1', name: 'gamma', value: 3 },
      { id: '2', name: 'alpha', value: 1 },
      { id: '3', name: 'beta', value: 2 },
    ]
    const { container } = render(
      <DataTable
        data={data}
        columns={baseColumns}
        virtualizeThreshold={1000}
        tableConfigKey={TABLE_KEY}
        defaultSorting={[{ id: 'name', desc: false }]}
      />,
    )
    const firstNames = () =>
      Array.from(container.querySelectorAll('.dt-body .dt-row [data-col-id="name"] .dt-cell-text')).map(
        (el) => el.textContent,
      )
    expect(firstNames()).toEqual(['alpha', 'beta', 'gamma'])
    const headerBtn = screen.getAllByRole('button', { name: /^Name/ })[0]
    await user.click(headerBtn)
    expect(firstNames()).toEqual(['gamma', 'beta', 'alpha'])
  })

  it('row selection: toggling a row checkbox updates selection state', async () => {
    const user = userEvent.setup()
    const data: Row[] = [
      { id: 'a', name: 'A', value: 1 },
      { id: 'b', name: 'B', value: 2 },
    ]
    const cols = [selectionColumn<Row>(), ...baseColumns]
    render(
      <DataTable
        data={data}
        columns={cols}
        virtualizeThreshold={1000}
        getRowId={(r) => r.id}
        enableRowSelection
      />,
    )
    const checks = screen.getAllByRole('checkbox')
    expect(checks.length).toBeGreaterThanOrEqual(2)
    await user.click(checks[1])
    expect(checks[1]).toBeChecked()
    await user.click(checks[1])
    expect(checks[1]).not.toBeChecked()
  })

  it('manual pagination: footer navigates pages and shows sliced server data', async () => {
    const user = userEvent.setup()
    const all: Row[] = [
      { id: '1', name: 'r1', value: 1 },
      { id: '2', name: 'r2', value: 2 },
      { id: '3', name: 'r3', value: 3 },
      { id: '4', name: 'r4', value: 4 },
      { id: '5', name: 'r5', value: 5 },
    ]
    function ManualPagingFixture() {
      const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 2 })
      const pageSlice = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize
        return all.slice(start, start + pagination.pageSize)
      }, [pagination])
      return (
        <DataTable
          data={pageSlice}
          columns={baseColumns}
          virtualizeThreshold={1000}
          manualPagination
          pageCount={3}
          manualPaginationTotalRows={5}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      )
    }
    render(<ManualPagingFixture />)
    expect(screen.getByText('r1')).toBeInTheDocument()
    expect(screen.getByText('r2')).toBeInTheDocument()
    expect(screen.queryByText('r3')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('r3')).toBeInTheDocument()
    expect(screen.getByText('r4')).toBeInTheDocument()
  })

  it('manual pagination: footer stays visible when all rows fit on one page (page size remains reachable)', () => {
    const all: Row[] = [{ id: '1', name: 'only', value: 1 }]
    function SinglePageManualFixture() {
      const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
      return (
        <DataTable
          data={all}
          columns={baseColumns}
          virtualizeThreshold={1000}
          manualPagination
          pageCount={1}
          manualPaginationTotalRows={1}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      )
    }
    render(<SinglePageManualFixture />)
    expect(document.querySelector('.dt-footer')).toBeTruthy()
    expect(document.querySelector('.dt-page-size-select')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('tree mode: expanding a parent reveals child rows (paginateExpandedRows with pagination)', async () => {
    const user = userEvent.setup()
    const treeData: TreeRow[] = [
      {
        id: 'p1',
        name: 'Parent',
        children: [{ id: 'c1', name: 'Child', children: undefined }],
      },
    ]
    const treeCols: ColumnDef<TreeRow, unknown>[] = [
      { accessorKey: 'name', header: 'Name', id: 'name' },
    ]
    render(
      <DataTable
        data={treeData}
        columns={treeCols}
        virtualizeThreshold={1000}
        treeMode
        getSubRows={(r) => r.children}
        getRowId={(r) => r.id}
        pagination={{ pageIndex: 0, pageSize: 25 }}
      />,
    )
    const expandBtn = screen.getByRole('button', { name: 'Expand' })
    await user.click(expandBtn)
    expect(screen.getByText('Child')).toBeInTheDocument()
  })

  it('tree mode with noPagination still expands children (paginateExpandedRows true)', async () => {
    const user = userEvent.setup()
    const treeData: TreeRow[] = [
      {
        id: 'p1',
        name: 'Root',
        children: [{ id: 'c1', name: 'Nested' }],
      },
    ]
    const treeCols: ColumnDef<TreeRow, unknown>[] = [
      { accessorKey: 'name', header: 'Name', id: 'name' },
    ]
    render(
      <DataTable
        data={treeData}
        columns={treeCols}
        virtualizeThreshold={1000}
        treeMode
        noPagination
        getSubRows={(r) => r.children}
        getRowId={(r) => r.id}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('Nested')).toBeInTheDocument()
  })

  it('pinned bottom rows render in dt-pinned-bottom with cell text', () => {
    const data: Row[] = [{ id: '1', name: 'Row', value: 1 }]
    const totals: Row[] = [{ id: '__totals__', name: 'Total', value: 42 }]
    const { container } = render(
      <DataTable
        data={data}
        columns={baseColumns}
        virtualizeThreshold={1000}
        pinnedBottomRows={totals}
      />,
    )
    const pin = container.querySelector('.dt-pinned-bottom')
    expect(pin).toBeTruthy()
    expect(within(pin as HTMLElement).getByText('42')).toBeInTheDocument()
  })

  it('controlled column visibility hides a leaf column', () => {
    render(
      <DataTable
        data={[{ id: '1', name: 'only', value: 99 }]}
        columns={baseColumns}
        virtualizeThreshold={1000}
        columnVisibility={{ value: false }}
      />,
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Value/ })).not.toBeInTheDocument()
  })

  it('tableConfigKey persists sorting to useTableConfigStore when header toggled', async () => {
    const user = userEvent.setup()
    const data: Row[] = [
      { id: '1', name: 'z', value: 1 },
      { id: '2', name: 'a', value: 2 },
    ]
    render(
      <DataTable
        data={data}
        columns={baseColumns}
        virtualizeThreshold={1000}
        tableConfigKey={TABLE_KEY}
        defaultSorting={[{ id: 'name', desc: false }]}
      />,
    )
    const nameHeader = screen.getAllByRole('button', { name: /^Name/ })[0]
    await user.click(nameHeader)
    const stored = selectTableConfig(TABLE_KEY)(useTableConfigStore.getState()).sorting
    expect(stored).toEqual([{ id: 'name', desc: true }])
  })
})
