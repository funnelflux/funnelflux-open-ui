import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui-kit/data-table'

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
  const columnDefs = useMemo((): ColumnDef<SampleRow, unknown>[] => [
    { id: 'name', header: 'Campaign', accessorKey: 'name', size: 250, meta: { flex: 1 } },
    { id: 'source', header: 'Source', accessorKey: 'source', size: 120 },
    { id: 'visits', header: 'Visits', accessorKey: 'visits', size: 100, meta: { numeric: true }, cell: (info) => Number(info.getValue()).toLocaleString() },
    { id: 'clicks', header: 'Clicks', accessorKey: 'clicks', size: 100, meta: { numeric: true }, cell: (info) => Number(info.getValue()).toLocaleString() },
    { id: 'conversions', header: 'Conv', accessorKey: 'conversions', size: 90, meta: { numeric: true }, cell: (info) => Number(info.getValue()).toLocaleString() },
    { id: 'revenue', header: 'Revenue', accessorKey: 'revenue', size: 120, meta: { numeric: true }, cell: (info) => Number(info.getValue()).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) },
    { id: 'cost', header: 'Cost', accessorKey: 'cost', size: 120, meta: { numeric: true }, cell: (info) => Number(info.getValue()).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) },
    { id: 'profit', header: 'Profit', accessorKey: 'profit', size: 120, meta: { numeric: true }, cell: (info) => {
      const v = Number(info.getValue())
      const cls = v > 0 ? 'dt-cell--profit' : v < 0 ? 'dt-cell--loss' : ''
      return <span className={cls}>{v.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}</span>
    } },
    { id: 'roi', header: 'ROI', accessorKey: 'roi', size: 90, meta: { numeric: true }, cell: (info) => `${Number(info.getValue()).toFixed(2)}%` },
    { id: 'cr', header: 'CR', accessorKey: 'cr', size: 80, meta: { numeric: true }, cell: (info) => `${Number(info.getValue()).toFixed(2)}%` },
  ], [])

  return (
    <section id="tables">
      <h2 className="text-xl font-semibold text-foreground mb-6">Tables (DataTable)</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Import: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'import { DataTable } from "@/components/ui-kit"'}</code>
      </p>

      <div className="mb-4 p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          Columns are TanStack <code>ColumnDef</code> entries: use <code>accessorKey</code>, <code>meta.numeric</code> for alignment, and <code>cell</code> for formatting.
        </p>
      </div>

      <DataTable<SampleRow>
        data={sampleData}
        columns={columnDefs}
      />
    </section>
  )
}
