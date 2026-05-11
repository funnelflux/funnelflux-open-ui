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
import type { TrafficSourceGridRow } from '@/pages/traffic-sources/types'

interface UseTrafficSourcesColumnsArgs {
  statCols: ColumnDef<TrafficSourceGridRow, unknown>[]
  onEditEntity: (id: string) => void
  onCloneEntity: (id: string) => void
  onArchiveEntity: (id: string, archive: boolean) => void
  onDeleteEntity: (id: string) => void
  onOpenCategoryRename: (row: TrafficSourceGridRow) => void
  onRequestCategoryDelete: (idCategory: string) => void
}

export function useTrafficSourcesColumns({
  statCols,
  onEditEntity,
  onCloneEntity,
  onArchiveEntity,
  onDeleteEntity,
  onOpenCategoryRename,
  onRequestCategoryDelete,
}: UseTrafficSourcesColumnsArgs) {
  const isDefaultSource = useCallback((row: TrafficSourceGridRow) => row.id === '1', [])

  const hideCategoryStripEditDelete = useCallback((row: TrafficSourceGridRow) => {
    if (!row._isCategoryHeader) return false
    const categoryId = row._categoryId ?? ''
    return categoryId === ''
  }, [])

  const hideEditButton = useCallback((row: TrafficSourceGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return isDefaultSource(row) || row.id === '__totals__'
  }, [hideCategoryStripEditDelete, isDefaultSource])

  const hideCloneArchive = useCallback((row: TrafficSourceGridRow) =>
    Boolean(row._isCategoryHeader) || isDefaultSource(row) || row.id === '__totals__'
  , [isDefaultSource])

  const hideDeleteButton = useCallback((row: TrafficSourceGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return isDefaultSource(row) || row.id === '__totals__'
  }, [hideCategoryStripEditDelete, isDefaultSource])

  const handleEditOrCategory = useCallback(
    (row: TrafficSourceGridRow) => {
      if (row._isCategoryHeader) {
        onOpenCategoryRename(row)
        return
      }
      onEditEntity(row.id)
    },
    [onEditEntity, onOpenCategoryRename],
  )

  const handleDeleteOrCategory = useCallback(
    (row: TrafficSourceGridRow) => {
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

  const columnDefs = useMemo<ColumnDef<TrafficSourceGridRow, unknown>[]>(() => [
    selectionColumn<TrafficSourceGridRow>(),
    nameColumn<TrafficSourceGridRow>({
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
    editBtnColumn<TrafficSourceGridRow>((row) => handleEditOrCategory(row), { hidden: hideEditButton }),
    cloneBtnColumn<TrafficSourceGridRow>((row) => onCloneEntity(row.id), { hidden: hideCloneArchive }),
    archiveBtnColumn<TrafficSourceGridRow>(
      (row, archive) => onArchiveEntity(row.id, archive),
      {
        hidden: hideCloneArchive,
        isArchived: (row) => row.isArchived === true,
      },
    ),
    deleteBtnColumn<TrafficSourceGridRow>((row) => handleDeleteOrCategory(row), { hidden: hideDeleteButton }),
    idColumn<TrafficSourceGridRow>({ hideIdForRow: (row) => Boolean(row._isCategoryHeader) }),
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
    'traffic-sources',
    { defaultVisibleColumnIds: defaultColIds },
  )

  return {
    columnDefs,
    gridColumnVisibility,
  }
}
