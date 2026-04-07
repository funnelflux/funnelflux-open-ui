import { useState, useMemo, useCallback } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useConditions, useSaveCondition, useDeleteCondition } from '@/api/hooks'
import { PageShell, DataGrid, SearchToolbar, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
import { InlineActions } from '@/components/shared/InlineActions'
import { ConditionEditor } from '@/components/funnel-builder/ConditionEditor'
import { Button, Tag } from 'antd'
import { getErrorMessage } from '@/lib/utils'
import type { Condition } from '@/types/funnel'

export function GlobalConditionsPage() {
  const toast = useToastApi()
  const { data: conditions, isLoading } = useConditions('global')
  const saveCondition = useSaveCondition()
  const deleteCondition = useDeleteCondition()

  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editCondition, setEditCondition] = useState<Condition | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const list = conditions ?? []
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((c) => c.conditionName.toLowerCase().includes(q))
  }, [conditions, search])

  const handleSave = useCallback(
    async (condition: Condition) => {
      try {
        await saveCondition.mutateAsync(condition)
        toast.success(editCondition ? 'Condition updated' : 'Condition created')
        setEditorOpen(false)
        setEditCondition(null)
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    },
    [saveCondition, toast, editCondition],
  )

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

  const columns = useMemo<ColDef<Condition>[]>(
    () => [
      {
        colId: 'name',
        headerName: 'Name',
        field: 'conditionName',
        sortable: true,
        cellRenderer: (params: { data: Condition }) => (
          <span className="font-medium">{params.data.conditionName}</span>
        ),
      },
      {
        colId: 'scope',
        headerName: 'Scope',
        field: 'scope',
        cellRenderer: (params: { data: Condition }) => (
          <Tag className="text-xs capitalize">
            {params.data.scope}
          </Tag>
        ),
      },
      {
        colId: 'rules',
        headerName: 'Rules',
        valueGetter: (params: { data: Condition | undefined }) => {
          if (!params.data) return 0
          return params.data.blocks.reduce((sum, b) => sum + b.rules.length, 0)
        },
        cellRenderer: (params: { value: number }) => (
          <span className="text-muted-foreground text-sm">
            {params.value} rule{params.value !== 1 ? 's' : ''}
          </span>
        ),
      },
      {
        colId: 'blocks',
        headerName: 'Blocks',
        valueGetter: (params: { data: Condition | undefined }) =>
          params.data ? params.data.blocks.length : 0,
        cellRenderer: (params: { data: Condition; value: number }) => (
          <span className="text-muted-foreground text-sm">
            {params.value} ({params.data.blockLogicOperator})
          </span>
        ),
      },
      {
        colId: 'id',
        headerName: 'ID',
        field: 'idCondition',
        cellRenderer: (params: { data: Condition }) => (
          <span className="font-mono text-xs text-muted-foreground">{params.data.idCondition}</span>
        ),
      },
      {
        colId: 'actions',
        headerName: '',
        sortable: false,
        cellRenderer: (params: { data: Condition }) => (
          <InlineActions
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => {
                  setEditCondition(params.data)
                  setEditorOpen(true)
                },
              },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onClick: () => setDeleteId(params.data.idCondition),
              },
            ]}
          />
        ),
      },
    ],
    [],
  )

  return (
    <PageShell
      title="Global Conditions"
      actions={
        <Button
          type="primary"
          onClick={() => {
            setEditCondition(null)
            setEditorOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>
      }
    >
      <SearchToolbar value={search} onChange={setSearch} placeholder="Search conditions..." />

      {filtered.length === 0 && !isLoading ? (
        <EmptyState message="No global conditions found. Create one to get started." />
      ) : (
        <DataGrid<Condition>
          rowData={filtered}
          columnDefs={columns}
          getRowId={(p) => p.data.idCondition}
          loading={isLoading}
        />
      )}

      <ConditionEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
          setEditCondition(null)
        }}
        condition={editCondition}
        onSave={handleSave}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
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
