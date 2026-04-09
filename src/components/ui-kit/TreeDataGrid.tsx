import { AgGridReact } from 'ag-grid-react'
import type { AgGridReactProps } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
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
    <div className="ag-theme-quartz w-full" style={{ height: props.domLayout === 'autoHeight' ? undefined : '100%' }}>
      <AgGridReact<TData>
        theme={themeQuartz}
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
        rowHeight={36}
        headerHeight={32}
        animateRows={false}
        suppressCellFocus
        groupDefaultExpanded={1}
        domLayout="autoHeight"
        {...props}
      />
    </div>
  )
}
