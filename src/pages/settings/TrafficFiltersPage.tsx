import { useState, useCallback, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { Button, Switch, PageShell, DataTable, ConfirmModal, useToastApi } from '@/components/ui-kit'
import { editBtnColumn, resetStatsBtnColumn, deleteBtnColumn } from '@/components/ui-kit/data-table'
import {
  useTrafficFilters,
  useSaveTrafficFilter,
  useDeleteTrafficFilter,
  useApplyTrafficFilterRetroactively,
} from '@/api/hooks/useTrafficFilters'
import { TrafficFilterModal } from '@/components/forms/TrafficFilterModal'
import { FILTER_TYPE_LABELS } from '@/lib/trafficFilterConstants'
import type { TrafficFilterFormData } from '@/schemas/trafficFilter'
import type { TrafficFilter } from '@/types/entities'

export function TrafficFiltersPage() {
  const toast = useToastApi()
  const { data: filters, isLoading } = useTrafficFilters()
  const saveFilter = useSaveTrafficFilter()
  const deleteFilter = useDeleteTrafficFilter()
  const applyRetro = useApplyTrafficFilterRetroactively()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingFilter, setEditingFilter] = useState<TrafficFilter | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TrafficFilter | null>(null)

  function openCreate() {
    setEditingFilter(undefined)
    setSheetOpen(true)
  }

  const openEdit = useCallback((filter: TrafficFilter) => {
    setEditingFilter(filter)
    setSheetOpen(true)
  }, [])

  const applyRetroMutate = applyRetro.mutate
  const handleApplyRetroactively = useCallback((filter: TrafficFilter) => {
    applyRetroMutate(filter.idTrafficFilter, {
      onSuccess: () => {
        toast.success(`Filter "${filter.trafficFilterName}" applied retroactively`)
      },
      onError: (err) => {
        toast.error(`Failed to apply filter: ${(err as Error).message}`)
      },
    })
  }, [applyRetroMutate, toast])

  const saveFilterMutate = saveFilter.mutate
  const handleToggleEnabled = useCallback((filter: TrafficFilter) => {
    saveFilterMutate(
      { ...filter, isEnabled: !filter.isEnabled },
      {
        onSuccess: () => {
          toast.success(
            `Filter "${filter.trafficFilterName}" ${filter.isEnabled ? 'disabled' : 'enabled'}`,
          )
        },
        onError: (err) => {
          toast.error(`Failed to update filter: ${(err as Error).message}`)
        },
      },
    )
  }, [saveFilterMutate, toast])

  function confirmDelete() {
    if (!deleteTarget) return
    deleteFilter.mutate(deleteTarget.idTrafficFilter, {
      onSuccess: () => {
        toast.success(`Filter "${deleteTarget.trafficFilterName}" deleted`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(`Failed to delete filter: ${(err as Error).message}`)
        setDeleteTarget(null)
      },
    })
  }

  function handleSubmit(data: TrafficFilterFormData) {
    saveFilter.mutate(data, {
      onSuccess: () => {
        toast.success(editingFilter ? 'Filter updated' : 'Filter created')
        setSheetOpen(false)
      },
      onError: (err) => {
        toast.error(`Failed to save filter: ${(err as Error).message}`)
      },
    })
  }

  const columns = useMemo<ColumnDef<TrafficFilter, unknown>[]>(
    () => [
      {
        id: 'trafficFilterName',
        header: 'Name',
        accessorKey: 'trafficFilterName',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.trafficFilterName}</span>
        ),
      },
      editBtnColumn<TrafficFilter>((row) => openEdit(row)),
      resetStatsBtnColumn<TrafficFilter>((row) => handleApplyRetroactively(row)),
      deleteBtnColumn<TrafficFilter>((row) => setDeleteTarget(row)),
      {
        id: 'filterType',
        header: 'Type',
        accessorKey: 'filterType',
        cell: ({ row }) =>
          FILTER_TYPE_LABELS[row.original.filterType] ?? row.original.filterType,
      },
      {
        id: 'entriesCount',
        header: 'Entries',
        accessorFn: (row) => row.filterEntries?.length ?? 0,
      },
      {
        id: 'isEnabled',
        header: 'Enabled',
        accessorKey: 'isEnabled',
        enableSorting: false,
        cell: ({ row }) => (
          <Switch
            checked={row.original.isEnabled}
            onChange={() => handleToggleEnabled(row.original)}
          />
        ),
      },
      {
        id: 'idTrafficFilter',
        header: 'ID',
        accessorKey: 'idTrafficFilter',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.idTrafficFilter}
          </span>
        ),
      },
    ],
    [openEdit, handleApplyRetroactively, handleToggleEnabled],
  )

  return (
    <PageShell fillHeight
      title="Traffic Filters"
      actions={
        <Button type="primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Filter
        </Button>
      }
    >
      <DataTable<TrafficFilter>
        data={filters ?? []}
        columns={columns}
        getRowId={(row) => row.idTrafficFilter}
        loading={isLoading}
        noPagination
        emptyMessage="No traffic filters configured."
      />

      <TrafficFilterModal
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialData={editingFilter}
        onSubmit={handleSubmit}
        isSubmitting={saveFilter.isPending}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Traffic Filter"
        description={`Are you sure you want to delete "${deleteTarget?.trafficFilterName}"? This cannot be undone.`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  )
}
