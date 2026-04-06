import { AgGridReact } from 'ag-grid-react'
import type { AgGridReactProps } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import '@/styles/ag-grid-theme.css'

ModuleRegistry.registerModules([AllCommunityModule])

interface TreeDataGridProps<TData = unknown> extends AgGridReactProps<TData> {
  getDataPath: (data: TData) => string[]
}

export function TreeDataGrid<TData = unknown>({
  getDataPath,
  ...props
}: TreeDataGridProps<TData>) {
  return (
    <div className="ag-theme-funnelflux w-full" style={{ height: props.domLayout === 'autoHeight' ? undefined : '100%' }}>
      <AgGridReact<TData>
        treeData
        getDataPath={getDataPath}
        autoGroupColumnDef={{
          headerName: 'Group',
          minWidth: 250,
          cellRendererParams: { suppressCount: false },
        }}
        pagination
        paginationPageSize={50}
        paginationPageSizeSelector={[25, 50, 100, 200]}
        rowHeight={40}
        headerHeight={36}
        animateRows={false}
        suppressCellFocus
        groupDefaultExpanded={1}
        domLayout="autoHeight"
        {...props}
      />
    </div>
  )
}
