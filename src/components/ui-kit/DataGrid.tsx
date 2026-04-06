import { AgGridReact } from 'ag-grid-react'
import type { AgGridReactProps } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import '@/styles/ag-grid-theme.css'

ModuleRegistry.registerModules([AllCommunityModule])

/* Pre-built column type definitions for common patterns */
export const numericColumn: Partial<ColDef> = {
  type: 'rightAligned',
  valueFormatter: (p: ValueFormatterParams) =>
    p.value != null ? Number(p.value).toLocaleString() : '',
}

export const currencyColumn: Partial<ColDef> = {
  type: 'rightAligned',
  valueFormatter: (p: ValueFormatterParams) =>
    p.value != null
      ? Number(p.value).toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        })
      : '',
}

export const percentColumn: Partial<ColDef> = {
  type: 'rightAligned',
  valueFormatter: (p: ValueFormatterParams) =>
    p.value != null ? `${Number(p.value).toFixed(2)}%` : '',
}

export const profitLossColumn: Partial<ColDef> = {
  ...currencyColumn,
  cellClassRules: {
    'text-profit': (p) => Number(p.value) > 0,
    'text-loss': (p) => Number(p.value) < 0,
  },
}

export function DataGrid<TData = unknown>(props: AgGridReactProps<TData>) {
  return (
    <div className="ag-theme-funnelflux w-full" style={{ height: props.domLayout === 'autoHeight' ? undefined : '100%' }}>
      <AgGridReact<TData>
        pagination
        paginationPageSize={50}
        paginationPageSizeSelector={[25, 50, 100, 200]}
        rowHeight={40}
        headerHeight={36}
        animateRows={false}
        suppressCellFocus
        domLayout="autoHeight"
        {...props}
      />
    </div>
  )
}
