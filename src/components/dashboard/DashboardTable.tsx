import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Card } from 'antd'
import { DataTable, entityRowId } from '@/components/ui-kit/data-table'
import type { DashboardData } from '@/types/ui'
import { getCell } from '@/lib/funnelQuickStats'

type TableStats = DashboardData['tableStats']

interface DashboardTableProps {
  data?: TableStats
  isLoading: boolean
}

interface FlatRow {
  id: string
  [key: string]: string
}

function flattenRows(data: TableStats): FlatRow[] {
  if (!data?.report?.rows) return []
  const { columns, rows } = data.report

  return rows.map((row, rowIndex) => {
    const flat: FlatRow = { id: String(rowIndex) }
    columns.forEach((col, colIndex) => {
      const cell = getCell(row, colIndex)
      flat[col.name] = cell.formatted ?? String(cell.raw ?? '')
    })
    return flat
  })
}

export function DashboardTable({ data, isLoading }: DashboardTableProps) {
  const rows = useMemo(() => flattenRows(data), [data])

  const columnDefs: ColumnDef<FlatRow, unknown>[] = useMemo(() => {
    if (!data?.report?.columns) return []
    return data.report.columns.map((col, index) => ({
      id: col.name,
      header: col.name,
      accessorKey: col.name,
      size: index === 0 ? 200 : 100,
      meta: index === 0 ? { flex: 1 } : { numeric: true },
    }))
  }, [data])

  if (!isLoading && !data) return null

  return (
    <Card title={<span className="text-sm font-medium">Top {data?.options?.statsType ?? 'Campaigns'}</span>} styles={{ header: { padding: '16px 16px 8px' }, body: { padding: '0 16px 16px' } }}>
      <DataTable
        data={rows}
        columns={columnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        noPagination
      />
    </Card>
  )
}
