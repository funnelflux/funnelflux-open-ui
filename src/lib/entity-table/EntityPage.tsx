import type { ComponentProps, ReactNode } from 'react'
import { PageShell, SearchToolbar, type PageShellBodyState } from '@/components/ui-kit'
import { DataTable } from '@/components/ui-kit/data-table'
import type { DataTableProps } from '@/components/ui-kit/data-table'

export interface EntityPageProps<TData> {
  title: string
  bodyState?: PageShellBodyState
  fillHeight?: boolean
  headerActions?: ReactNode
  topContent?: ReactNode
  searchToolbarProps: ComponentProps<typeof SearchToolbar>
  tableProps: DataTableProps<TData>
  bulkActions?: ReactNode
  overlays?: ReactNode
}

/**
 * Unified, composable entity-page scaffold shared by all table-first pages.
 * Optional slots allow category strip filters, CSV imports, tree-mode tables, and custom dialogs.
 */
export function EntityPage<TData>({
  title,
  bodyState,
  fillHeight = true,
  headerActions,
  topContent,
  searchToolbarProps,
  tableProps,
  bulkActions,
  overlays,
}: EntityPageProps<TData>) {
  return (
    <PageShell fillHeight={fillHeight} title={title} bodyState={bodyState} actions={headerActions}>
      {topContent}
      <SearchToolbar {...searchToolbarProps} />
      <DataTable<TData> {...tableProps} />
      {bulkActions}
      {overlays}
    </PageShell>
  )
}
