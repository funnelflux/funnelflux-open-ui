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
import { useEntityGridColumnVisibility } from '@/lib/entity-table/columns/visibility'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'

interface EntityTableRow {
  id: string
  name: string
  _isCategoryHeader?: boolean
  _categoryId?: string
  isArchived?: boolean
}

interface UseEntityTableColumnsArgs<TRow extends EntityTableRow> {
  tableConfigKey: string
  statCols: ColumnDef<TRow, unknown>[]
  onEditEntity: (id: string) => void
  onCloneEntity: (id: string) => void
  onArchiveEntity: (row: TRow, archive: boolean) => void
  onDeleteEntity: (id: string) => void
  onOpenCategoryRename: (row: TRow) => void
  onRequestCategoryDelete: (idCategory: string) => void
  hideScopes?: Set<'offer' | 'lander'>
  isProtectedEntityRow?: (row: TRow) => boolean
}

export function useEntityTableColumns<TRow extends EntityTableRow>({
  tableConfigKey,
  statCols,
  onEditEntity,
  onCloneEntity,
  onArchiveEntity,
  onDeleteEntity,
  onOpenCategoryRename,
  onRequestCategoryDelete,
  hideScopes,
  isProtectedEntityRow,
}: UseEntityTableColumnsArgs<TRow>) {
  const hideCategoryStripEditDelete = useCallback((row: TRow) => {
    if (!row._isCategoryHeader) return false
    return (row._categoryId ?? '') === ''
  }, [])

  const isProtected = useCallback(
    (row: TRow) => (isProtectedEntityRow ? isProtectedEntityRow(row) : false),
    [isProtectedEntityRow],
  )

  const hideEditButton = useCallback((row: TRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return isProtected(row) || row.id === '__totals__'
  }, [hideCategoryStripEditDelete, isProtected])

  const hideCloneArchive = useCallback((row: TRow) =>
    Boolean(row._isCategoryHeader) || isProtected(row) || row.id === '__totals__'
  , [isProtected])

  const hideDeleteButton = useCallback((row: TRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return isProtected(row) || row.id === '__totals__'
  }, [hideCategoryStripEditDelete, isProtected])

  const handleEditOrCategory = useCallback(
    (row: TRow) => {
      if (row._isCategoryHeader) {
        onOpenCategoryRename(row)
        return
      }
      onEditEntity(row.id)
    },
    [onEditEntity, onOpenCategoryRename],
  )

  const handleDeleteOrCategory = useCallback(
    (row: TRow) => {
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

  const columnDefs = useMemo<ColumnDef<TRow, unknown>[]>(() => [
    selectionColumn<TRow>(),
    nameColumn<TRow>({
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
    editBtnColumn<TRow>((row) => handleEditOrCategory(row), { hidden: hideEditButton }),
    cloneBtnColumn<TRow>((row) => onCloneEntity(row.id), { hidden: hideCloneArchive }),
    archiveBtnColumn<TRow>(
      (row, archive) => onArchiveEntity(row, archive),
      {
        hidden: hideCloneArchive,
        isArchived: (row) => row.isArchived === true,
      },
    ),
    deleteBtnColumn<TRow>((row) => handleDeleteOrCategory(row), { hidden: hideDeleteButton }),
    idColumn<TRow>({ hideIdForRow: (row) => Boolean(row._isCategoryHeader) }),
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
