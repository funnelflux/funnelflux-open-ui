import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  useConditions,
  useCondition,
  useSaveCondition,
  useDeleteCondition,
  type ConditionListItem,
} from '@/api/hooks'
import { Button, PageShell, DataTable, SearchToolbar, ConfirmModal, useToastApi } from '@/components/ui-kit'
import { editBtnColumn, deleteBtnColumn } from '@/components/ui-kit/data-table'
import { ConditionEditor } from '@/components/funnel-builder/ConditionEditor'
import { Tag } from '@/components/ui-kit'
import { getErrorMessage } from '@/lib/utils'
import type { FunnelCondition } from '@/types/entities'

function conditionRowId(row: ConditionListItem): string {
  return row.idCondition
}

export function GlobalConditionsPage() {
  const toast = useToastApi()
  const { data: conditionRows, isLoading, refetch: refetchConditions, isFetching } = useConditions()
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
        cell: ({ row }) => (
          <span className="font-medium">{row.original.conditionName}</span>
        ),
      },
      editBtnColumn<ConditionListItem>(handleEditCondition),
      deleteBtnColumn<ConditionListItem>(handleDeleteClick),
      {
        id: 'scope',
        header: 'Scope',
        accessorFn: (row) => {
          const r = row.restrictToFunnelId
          if (r === undefined) return ''
          return r !== '' && r !== '0' ? 'funnel' : 'global'
        },
        cell: ({ row }) => {
          const r = row.original.restrictToFunnelId
          if (r === undefined) {
            return <span className="text-muted-foreground text-sm">—</span>
          }
          return r !== '' && r !== '0' ? (
            <Tag className="text-xs capitalize">funnel</Tag>
          ) : (
            <Tag className="text-xs capitalize">global</Tag>
          )
        },
      },
      {
        id: 'rules',
        header: 'Rules',
        accessorFn: (row) =>
          (row.orTests ?? []).reduce((sum, block) => sum + (block.andTests?.length ?? 0), 0),
        cell: ({ getValue }) => {
          const n = getValue() as number
          return (
            <span className="text-muted-foreground text-sm">
              {n} rule{n !== 1 ? 's' : ''}
            </span>
          )
        },
      },
      {
        id: 'blocks',
        header: 'Blocks',
        accessorFn: (row) => row.orTests?.length ?? 0,
        cell: ({ row, getValue }) => {
          const n = getValue() as number
          const op = (row.original.orTests?.length ?? 0) > 1 ? 'OR' : 'AND'
          return (
            <span className="text-muted-foreground text-sm">
              {n}
              {n > 0 ? ` (${op})` : ''}
            </span>
          )
        },
      },
      {
        id: 'id',
        header: 'ID',
        accessorKey: 'idCondition',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.idCondition}</span>
        ),
      },
    ],
    [handleDeleteClick, handleEditCondition],
  )

  return (
    <PageShell fillHeight
      title="Global Conditions"
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
        defaultSorting={[{ id: 'name', desc: false }]}
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
