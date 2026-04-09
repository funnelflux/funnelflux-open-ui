import { useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Card } from 'antd'
import { DataGrid } from '@/components/ui-kit'
import type { DashboardData } from '@/types/ui'
import type { ReportCell } from '@/types/stats'

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
      const cell = row[String(colIndex)] as ReportCell | undefined
      flat[col.name] = cell?.formatted ?? String(cell?.raw ?? '')
    })
    return flat
  })
}

export function DashboardTable({ data, isLoading }: DashboardTableProps) {
  const rows = useMemo(() => flattenRows(data), [data])

  const columnDefs: ColDef[] = useMemo(() => {
    if (!data?.report?.columns) return []
    return data.report.columns.map((col, index) => ({
      colId: col.name,
      headerName: col.name,
      field: col.name,
      flex: index === 0 ? 1 : undefined,
      width: index > 0 ? 100 : undefined,
    }))
  }, [data])

  if (!isLoading && !data) return null

  return (
    <Card title={<span className="text-sm font-medium">Top {data?.tableStatsOptions?.statsType ?? 'Campaigns'}</span>} styles={{ header: { padding: '16px 16px 8px' }, body: { padding: '0 16px 16px' } }}>
      <DataGrid
        rowData={rows}
        columnDefs={columnDefs}
        loading={isLoading}
        getRowId={(params) => params.data.id}
        pagination={false}
        domLayout="autoHeight"
      />
    </Card>
  )
}
