import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'

import { cn } from '@/lib/utils'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import './data-grid.css'

import type { DataGridProps } from './types'

ModuleRegistry.registerModules([AllCommunityModule])

/**
 * AG Grid wrapped for the app: registers community modules once, loads Quartz + token CSS,
 * and applies the shared theme.
 */
export function DataGrid<TData = unknown>({ className, ...props }: DataGridProps<TData>) {
  return (
    <div className={cn('ff-data-grid ag-theme-quartz flex min-h-0 w-full flex-1 flex-col', className)}>
      <AgGridReact<TData> {...props} />
    </div>
  )
}
