import { useState, useMemo, useCallback } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { useConditions, useCondition, useSaveCondition, useDeleteCondition } from '@/api/hooks'
import type { ConditionListRow } from '@/api/hooks/useConditions'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { RowActionsMenu } from '@/components/shared/RowActionsMenu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import { ConditionEditor } from '@/components/funnel-builder/ConditionEditor'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import type { Condition } from '@/types/funnel'

export function GlobalConditionsPage() {
  const toast = useToast()
  const { data: conditionRows, isLoading } = useConditions()
  const [editId, setEditId] = useState<string | null>(null)
  const { data: loadedCondition, isLoading: loadingCondition } = useCondition(editId ?? '')
  const saveCondition = useSaveCondition()
  const deleteCondition = useDeleteCondition()

  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const list = conditionRows ?? []
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((c) => c.name.toLowerCase().includes(q))
  }, [conditionRows, search])

  const handleSave = useCallback(
    async (condition: Condition) => {
      try {
        await saveCondition.mutateAsync(condition)
        toast.success(editId ? 'Condition updated' : 'Condition created')
        setEditorOpen(false)
        setEditId(null)
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    },
    [saveCondition, toast, editId],
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

  const columns = useMemo<ColumnDef<ConditionListRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row) => row.name,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        enableSorting: true,
      },
      {
        id: 'id',
        header: 'ID',
        accessorFn: (row) => row.id,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <RowActionsMenu
            actions={[
              {
                label: 'Edit',
                onClick: () => {
                  setEditId(row.original.id)
                  setEditorOpen(true)
                },
              },
              {
                label: 'Delete',
                destructive: true,
                onClick: () => setDeleteId(row.original.id),
              },
            ]}
          />
        ),
      },
    ],
    [],
  )

  const editorLoading = editorOpen && !!editId && loadingCondition
  const editorReady = editorOpen && (!editId || !!loadedCondition)

  return (
    <div className="space-y-4">
      <PageHeader title="Global Conditions">
        <Button
          size="sm"
          onClick={() => {
            setEditId(null)
            setEditorOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search conditions..." />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState message="No global conditions found. Create one to get started." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          getRowId={(row) => row.id}
        />
      )}

      {editorLoading ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <ConditionEditor
        open={editorReady}
        onClose={() => {
          setEditorOpen(false)
          setEditId(null)
        }}
        condition={editId ? loadedCondition ?? null : null}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete Condition"
        description="Are you sure? This condition will be permanently deleted and removed from any funnels using it."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleteCondition.isPending}
        destructive
      />
    </div>
  )
}
