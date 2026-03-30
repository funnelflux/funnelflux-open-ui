import { useState, useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useConditions, useSaveCondition, useDeleteCondition } from '@/api/hooks'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { RowActionsMenu } from '@/components/shared/RowActionsMenu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import { ConditionEditor } from '@/components/funnel-builder/ConditionEditor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getErrorMessage } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import type { Condition } from '@/types/funnel'

export function GlobalConditionsPage() {
  const toast = useToast()
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

  const columns = useMemo<ColumnDef<Condition>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row) => row.conditionName,
        cell: ({ row }) => <span className="font-medium">{row.original.conditionName}</span>,
        enableSorting: true,
      },
      {
        id: 'scope',
        header: 'Scope',
        accessorFn: (row) => row.scope,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {row.original.scope}
          </Badge>
        ),
      },
      {
        id: 'rules',
        header: 'Rules',
        cell: ({ row }) => {
          const count = row.original.blocks.reduce((sum, b) => sum + b.rules.length, 0)
          return <span className="text-muted-foreground text-sm">{count} rule{count !== 1 ? 's' : ''}</span>
        },
      },
      {
        id: 'blocks',
        header: 'Blocks',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.blocks.length} ({row.original.blockLogicOperator})
          </span>
        ),
      },
      {
        id: 'id',
        header: 'ID',
        accessorFn: (row) => row.idCondition,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.idCondition}</span>
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
                  setEditCondition(row.original)
                  setEditorOpen(true)
                },
              },
              {
                label: 'Delete',
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
    <div className="space-y-4">
      <PageHeader title="Global Conditions">
        <Button
          size="sm"
          onClick={() => {
            setEditCondition(null)
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
          getRowId={(row) => row.idCondition}
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
