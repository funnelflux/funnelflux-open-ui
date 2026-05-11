import { useCallback, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  archiveBtnColumn,
  cloneBtnColumn,
  deleteBtnColumn,
  editBtnColumn,
  idColumn,
  nameColumn,
  selectionColumn,
} from '@/components/ui-kit/data-table'
import { useEntityGridColumnVisibility } from '@/lib/entityGridColumnVisibility'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
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
  const hideCategoryStripEditDelete = useCallback((row: PageGridRow) => {
    if (!row._isCategoryHeader) return false
    return (row._categoryId ?? '') === ''
  }, [])

  const hideEditButton = useCallback((row: PageGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return row.id === '__totals__'
  }, [hideCategoryStripEditDelete])

  const hideCloneArchive = useCallback((row: PageGridRow) =>
    Boolean(row._isCategoryHeader) || row.id === '__totals__'
  , [])

  const hideDeleteButton = useCallback((row: PageGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return row.id === '__totals__'
  }, [hideCategoryStripEditDelete])

  const handleEditOrCategory = useCallback(
    (row: PageGridRow) => {
      if (row._isCategoryHeader) {
        onOpenCategoryRename(row)
        return
      }
      onEditEntity(row.id)
    },
    [onEditEntity, onOpenCategoryRename],
  )

  const handleDeleteOrCategory = useCallback(
    (row: PageGridRow) => {
      const categoryId = row._categoryId ?? ''
      if (row._isCategoryHeader) {
        if (!categoryId) return
        onRequestCategoryDelete(categoryId)
        return
      }
      onDeleteEntity(row.id)
    },
    [onDeleteEntity, onRequestCategoryDelete],
  )

  const columnDefs = useMemo<ColumnDef<PageGridRow, unknown>[]>(() => [
    selectionColumn<PageGridRow>(),
    nameColumn<PageGridRow>({
      size: 280,
      minSize: 150,
      maxSize: 560,
      cellContent: (row) => {
        if (row._isCategoryHeader) {
          return (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {row.name}
            </span>
          )
        }
        return <span className="truncate">{row.name}</span>
      },
    }),
    editBtnColumn<PageGridRow>((row) => handleEditOrCategory(row), { hidden: hideEditButton }),
    cloneBtnColumn<PageGridRow>((row) => onCloneEntity(row.id), { hidden: hideCloneArchive }),
    archiveBtnColumn<PageGridRow>(
      (row, archive) => onArchiveEntity(row, archive),
      {
        hidden: hideCloneArchive,
        isArchived: (row) => row.isArchived === true,
      },
    ),
    deleteBtnColumn<PageGridRow>((row) => handleDeleteOrCategory(row), { hidden: hideDeleteButton }),
    idColumn<PageGridRow>({ hideIdForRow: (row) => Boolean(row._isCategoryHeader) }),
    ...statCols,
  ], [
    statCols,
    handleEditOrCategory,
    onCloneEntity,
    onArchiveEntity,
    handleDeleteOrCategory,
    hideEditButton,
    hideCloneArchive,
    hideDeleteButton,
  ])

  const gridColumnVisibility = useEntityGridColumnVisibility(
    columnDefs as ColumnDef<unknown, unknown>[],
    tableConfigKey,
    { defaultVisibleColumnIds: defaultColIds, hideScopes },
  )

  return {
    columnDefs,
    gridColumnVisibility,
  }
}
