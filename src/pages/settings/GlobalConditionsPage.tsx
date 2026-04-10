import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useConditions, useSaveCondition, useDeleteCondition } from '@/api/hooks'
import { PageShell, DataTable, SearchToolbar, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
import { InlineActions } from '@/components/shared/InlineActions'
import { ConditionEditor } from '@/components/funnel-builder/ConditionEditor'
import { Button, Tag } from 'antd'
import { getErrorMessage } from '@/lib/utils'
import type { Condition } from '@/types/funnel'

export function GlobalConditionsPage() {
  const toast = useToastApi()
  const { data: conditionRows, isLoading } = useConditions()
  const saveCondition = useSaveCondition()
  const deleteCondition = useDeleteCondition()

  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const list = conditionRows ?? []
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((c) => c.conditionName.toLowerCase().includes(q))
  }, [conditionRows, search])

  const handleSave = useCallback(
    async (condition: Condition) => {
      try {
        await saveCondition.mutateAsync(condition)
        toast.success('Condition saved')
        setEditorOpen(false)
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

  const columns = useMemo<ColumnDef<Condition, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'conditionName',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.conditionName}</span>
        ),
      },
      {
        id: 'scope',
        header: 'Scope',
        accessorKey: 'scope',
        cell: ({ row }) => (
          <Tag className="text-xs capitalize">
            {row.original.scope}
          </Tag>
        ),
      },
      {
        id: 'rules',
        header: 'Rules',
        accessorFn: (row) =>
          row.blocks.reduce((sum, b) => sum + b.rules.length, 0),
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
        accessorFn: (row) => row.blocks.length,
        cell: ({ row, getValue }) => {
          const n = getValue() as number
          return (
            <span className="text-muted-foreground text-sm">
              {n} ({row.original.blockLogicOperator})
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
      {
        id: 'actions',
        header: '',
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <InlineActions
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => {
                  setEditorOpen(true)
                },
              },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onClick: () => setDeleteId(row.original.idCondition),
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
        <DataTable<Condition>
          data={filtered}
          columns={columns}
          getRowId={(row) => row.idCondition}
          loading={isLoading}
          noPagination
        />
      )}

      {editorOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <ConditionEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
        }}
        condition={null}
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
