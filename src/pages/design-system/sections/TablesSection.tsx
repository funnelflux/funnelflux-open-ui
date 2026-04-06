import { useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataGrid, numericColumn, currencyColumn, percentColumn, profitLossColumn } from '@/components/ui-kit'

interface SampleRow {
  name: string
  source: string
  visits: number
  clicks: number
  conversions: number
  revenue: number
  cost: number
  profit: number
  roi: number
  cr: number
}

const sampleData: SampleRow[] = [
  { name: 'Campaign Alpha', source: 'Facebook', visits: 12450, clicks: 8230, conversions: 245, revenue: 4900, cost: 2100, profit: 2800, roi: 133.3, cr: 2.98 },
  { name: 'Campaign Beta', source: 'Google', visits: 8720, clicks: 5440, conversions: 163, revenue: 3260, cost: 3800, profit: -540, roi: -14.2, cr: 3.0 },
  { name: 'Campaign Gamma', source: 'TikTok', visits: 24300, clicks: 15200, conversions: 456, revenue: 9120, cost: 5400, profit: 3720, roi: 68.9, cr: 3.0 },
  { name: 'Campaign Delta', source: 'Native', visits: 6100, clicks: 3800, conversions: 76, revenue: 1520, cost: 1800, profit: -280, roi: -15.6, cr: 2.0 },
  { name: 'Campaign Epsilon', source: 'Facebook', visits: 18500, clicks: 11200, conversions: 336, revenue: 6720, cost: 4200, profit: 2520, roi: 60.0, cr: 3.0 },
  { name: 'Campaign Zeta', source: 'Google', visits: 3200, clicks: 1920, conversions: 58, revenue: 1160, cost: 960, profit: 200, roi: 20.8, cr: 3.02 },
]

export function TablesSection() {
  const columnDefs = useMemo(
    (): ColDef[] => [
      { field: 'name', headerName: 'Campaign', flex: 1, minWidth: 180 },
      { field: 'source', headerName: 'Source', width: 120 },
      { field: 'visits', headerName: 'Visits', width: 100, ...numericColumn },
      { field: 'clicks', headerName: 'Clicks', width: 100, ...numericColumn },
      { field: 'conversions', headerName: 'Conv', width: 90, ...numericColumn },
      { field: 'revenue', headerName: 'Revenue', width: 120, ...currencyColumn },
      { field: 'cost', headerName: 'Cost', width: 120, ...currencyColumn },
      { field: 'profit', headerName: 'Profit', width: 120, ...profitLossColumn },
      { field: 'roi', headerName: 'ROI', width: 90, ...percentColumn },
      { field: 'cr', headerName: 'CR', width: 80, ...percentColumn },
    ],
    [],
  )

  return (
    <section id="tables">
      <h2 className="text-xl font-semibold text-foreground mb-6">Tables (AG-Grid)</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Import: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'import { DataGrid, currencyColumn } from "@/components/ui-kit"'}</code>
      </p>

      <div className="mb-4 p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          Column type helpers: <code>numericColumn</code>, <code>currencyColumn</code>,{' '}
          <code>percentColumn</code>, <code>profitLossColumn</code> (green/red coloring).
        </p>
      </div>

      <DataGrid<SampleRow>
        rowData={sampleData}
        columnDefs={columnDefs}
        rowSelection={{ mode: 'multiRow' }}
      />
    </section>
  )
}
