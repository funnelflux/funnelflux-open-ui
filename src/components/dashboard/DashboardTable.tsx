import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/shared/DataTable'
import type { DashboardData } from '@/types/ui'
import type { ReportCell } from '@/types/stats'

type TableStats = DashboardData['tableStats']

interface DashboardTableProps {
  data?: TableStats
  isLoading: boolean
}

// The report rows use numeric string keys for cell data
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

  const columns: ColumnDef<FlatRow>[] = useMemo(() => {
    if (!data?.report?.columns) return []
    return data.report.columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: ({ getValue }) => {
        const val = getValue() as string
        return <span className="text-sm">{val}</span>
      },
    }))
  }, [data])

  if (!isLoading && !data) return null

  return (
    <Card>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium">
          Top {data?.tableStatsOptions?.statsType ?? 'Campaigns'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          getRowId={(row) => row.id}
        />
      </CardContent>
    </Card>
  )
}
