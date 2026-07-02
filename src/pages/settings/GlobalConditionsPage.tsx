import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  useConditions,
  useCondition,
  useSaveCondition,
  useDeleteCondition,
  type ConditionListItem,
} from '@/api/hooks'
import { Button, PageShell, SearchToolbar, ConfirmModal, useToastApi, type PageShellBodyState } from '@/components/ui-kit'
import { DataTable } from '@/components/ui-kit/data-table'
import { editBtnColumn, deleteBtnColumn } from '@/components/ui-kit/data-table'
import { ConditionEditor } from '@/components/forms/ConditionEditor'
import { getErrorMessage } from '@/lib/utils'
import type { FunnelCondition } from '@/types/entities'

function conditionRowId(row: ConditionListItem): string {
  return row.idCondition
}

const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]

export function GlobalConditionsPage() {
  const toast = useToastApi()
  const { data: conditionRows, isLoading, isError, error, refetch: refetchConditions, isFetching } = useConditions()
  const saveCondition = useSaveCondition()
  const deleteCondition = useDeleteCondition()

  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const editCondition = useCondition(editId ?? '', {
    enabled: editorOpen && !!editId,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const filtered = useMemo(() => {
    const list = conditionRows ?? []
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((c) => c.conditionName.toLowerCase().includes(q))
  }, [conditionRows, search])

  const handleSave = useCallback(
    async (condition: FunnelCondition) => {
      try {
        await saveCondition.mutateAsync(condition)
        toast.success('Condition saved')
        setEditorOpen(false)
        setEditId(null)
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    }, [saveCondition, toast])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await deleteCondition.mutateAsync(deleteId)
      toast.success('Condition deleted')
      setDeleteId(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [deleteId, deleteCondition, toast])

  const handleRefreshConditions = useCallback(() => {
    void refetchConditions()
  }, [refetchConditions])

  const handleOpenEditor = useCallback(() => {
    setEditId(null)
    void refetchConditions()
    setEditorOpen(true)
  }, [refetchConditions])

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false)
    setEditId(null)
  }, [])

  const handleEditCondition = useCallback((row: ConditionListItem) => {
    setEditId(row.idCondition)
    setEditorOpen(true)
  }, [])

  const handleDeleteClick = useCallback((row: ConditionListItem) => {
    setDeleteId(row.idCondition)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setDeleteId(null)
  }, [])

  const columns = useMemo<ColumnDef<ConditionListItem, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'conditionName',
        size: 420,
        minSize: 280,
        maxSize: 640,
        meta: { flex: 1 },
        cell: ({ row }) => (
          <span className="font-medium">{row.original.conditionName}</span>
        ),
      },
      {
        id: 'id',
        header: 'ID',
        accessorKey: 'idCondition',
        size: 220,
        minSize: 140,
        maxSize: 320,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.idCondition}</span>
        ),
      },
      editBtnColumn<ConditionListItem>(handleEditCondition),
      deleteBtnColumn<ConditionListItem>(handleDeleteClick),
    ],
    [handleDeleteClick, handleEditCondition],
  )

  const bodyState: PageShellBodyState = isError
    ? {
        status: 'error',
        message: getErrorMessage(error),
        onRetry: () => void refetchConditions(),
      }
    : { status: 'ready' }

  return (
    <PageShell fillHeight
      title="Global Conditions"
      bodyState={bodyState}
      actions={
        <Button
          type="primary"
          iconName="plus"
          onClick={handleOpenEditor}
        >
          Add Condition
        </Button>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search conditions..."
        onRefresh={handleRefreshConditions}
        refreshLoading={isFetching}
      />

      <DataTable<ConditionListItem>
        data={filtered}
        columns={columns}
        getRowId={conditionRowId}
        loading={isLoading}
        tableConfigKey="settings-global-conditions"
        defaultSorting={DEFAULT_SORTING}
        noPagination
        emptyMessage="No global conditions found. Create one to get started."
      />

      <ConditionEditor
        open={editorOpen}
        onClose={handleCloseEditor}
        mode={editId ? 'edit' : 'create'}
        condition={editId ? (editCondition.data ?? null) : null}
        detailLoading={Boolean(editId && !editCondition.data && editCondition.isFetching)}
        onSave={handleSave}
        showScopeControl={false}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={handleCancelDelete}
        title="Delete Condition"
        description="Are you sure? This condition will be permanently deleted and removed from any funnels using it."
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={deleteCondition.isPending}
        danger
      />
    </PageShell>
  )
}
