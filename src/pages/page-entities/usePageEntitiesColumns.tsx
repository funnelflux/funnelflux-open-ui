import type { ColumnDef } from '@tanstack/react-table'
import { useEntityTableColumns } from '@/lib/entity-table/engine/useEntityTableColumns'
import type { PageGridRow } from '@/pages/page-entities/types'

interface UsePageEntitiesColumnsArgs {
  tableConfigKey: 'offers' | 'landers'
  statCols: ColumnDef<PageGridRow, unknown>[]
  hideScopes: Set<'offer' | 'lander'>
  onEditEntity: (id: string) => void
  onCloneEntity: (id: string) => void
  onArchiveEntity: (row: PageGridRow, archive: boolean) => void
  onDeleteEntity: (id: string) => void
  onOpenCategoryRename: (row: PageGridRow) => void
  onRequestCategoryDelete: (idCategory: string) => void
}

export function usePageEntitiesColumns({
  tableConfigKey,
  statCols,
  hideScopes,
  onEditEntity,
  onCloneEntity,
  onArchiveEntity,
  onDeleteEntity,
  onOpenCategoryRename,
  onRequestCategoryDelete,
}: UsePageEntitiesColumnsArgs) {
  const { columnDefs, gridColumnVisibility } = useEntityTableColumns<PageGridRow>({
    tableConfigKey,
    statCols,
    onEditEntity,
    onCloneEntity,
    onArchiveEntity,
    onDeleteEntity,
    onOpenCategoryRename,
    onRequestCategoryDelete,
    hideScopes,
  })

  return {
    columnDefs,
    gridColumnVisibility,
  }
}
