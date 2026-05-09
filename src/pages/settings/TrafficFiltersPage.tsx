import { useState, useCallback, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, Switch, PageShell, DataTable, ConfirmModal, useToastApi, type SelectOption } from '@/components/ui-kit'
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
import { getErrorMessage } from '@/lib/utils'
import type { KeyValuePair, TrafficFilter } from '@/types/entities'

function trafficFilterRowId(row: TrafficFilter): string {
  return row.idTrafficFilter
}

export function TrafficFiltersPage() {
  const toast = useToastApi()
  const { data: trafficFiltersData, isLoading } = useTrafficFilters()
  const saveFilter = useSaveTrafficFilter()
  const deleteFilter = useDeleteTrafficFilter()
  const applyRetro = useApplyTrafficFilterRetroactively()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingFilter, setEditingFilter] = useState<TrafficFilter | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TrafficFilter | null>(null)
  const [retroTarget, setRetroTarget] = useState<TrafficFilter | null>(null)

  const filters = trafficFiltersData?.filters ?? []
  const countryOptions = useMemo<SelectOption[]>(
    () =>
      (trafficFiltersData?.availableCountries ?? []).flatMap((country: KeyValuePair) => {
        if (!country?.key) return []
        return [{ value: country.key, label: country.value ?? country.key }]
      }),
    [trafficFiltersData?.availableCountries],
  )

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
    setRetroTarget(filter)
  }, [])

  const runApplyRetroactively = useCallback(() => {
    if (!retroTarget) return
    applyRetroMutate(retroTarget.idTrafficFilter, {
      onSuccess: () => {
        toast.success(`Filter "${retroTarget.trafficFilterName}" applied retroactively`)
        setRetroTarget(null)
      },
      onError: (err) => {
        toast.error(getErrorMessage(err))
      },
    })
  }, [applyRetroMutate, retroTarget, toast])

  const saveFilterMutate = saveFilter.mutate
  const handleToggleEnabled = useCallback((filter: TrafficFilter) => {
    saveFilterMutate(
      { data: { ...filter, isEnabled: !filter.isEnabled }, isCreate: false },
      {
        onSuccess: () => {
          toast.success(
            `Filter "${filter.trafficFilterName}" ${filter.isEnabled ? 'disabled' : 'enabled'}`,
          )
        },
        onError: (err) => {
          toast.error(getErrorMessage(err))
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
        toast.error(getErrorMessage(err))
        setDeleteTarget(null)
      },
    })
  }

  function handleSubmit(data: TrafficFilterFormData) {
    saveFilter.mutate(
      { data, isCreate: !editingFilter },
      {
        onSuccess: () => {
          toast.success(editingFilter ? 'Filter updated' : 'Filter created')
          setSheetOpen(false)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err))
        },
      },
    )
  }

  const columns = useMemo<ColumnDef<TrafficFilter, unknown>[]>(
    () => [
      {
        id: 'trafficFilterName',
        header: 'Name',
        accessorKey: 'trafficFilterName',
        size: 360,
        minSize: 280,
        maxSize: 560,
        meta: { flex: 1 },
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
        id: 'actionType',
        header: 'Action',
        accessorFn: (row) => row.redirectToURL ?? '',
        cell: ({ row }) =>
          row.original.redirectToURL ? 'Hide & Redirect' : 'Hide from statistics',
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
        <Button type="primary" iconName="plus" onClick={openCreate}>
          Add Filter
        </Button>
      }
    >
      <DataTable<TrafficFilter>
        data={filters}
        columns={columns}
        getRowId={trafficFilterRowId}
        loading={isLoading}
        tableConfigKey="settings-traffic-filters"
        defaultSorting={[{ id: 'trafficFilterName', desc: false }]}
        noPagination
        emptyMessage="No traffic filters configured."
      />

      <TrafficFilterModal
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialData={editingFilter}
        onSubmit={handleSubmit}
        isSubmitting={saveFilter.isPending}
        countryOptions={countryOptions}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Traffic Filter"
        description={`Are you sure you want to delete "${deleteTarget?.trafficFilterName}"? This cannot be undone.`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteFilter.isPending}
      />

      <ConfirmModal
        open={!!retroTarget}
        title="Apply filter retroactively"
        description={
          retroTarget
            ? `Apply "${retroTarget.trafficFilterName}" to historical stats? This is a destructive data operation similar to Reset Stats.`
            : ''
        }
        confirmText="Apply"
        danger
        loading={applyRetro.isPending}
        onConfirm={runApplyRetroactively}
        onCancel={() => setRetroTarget(null)}
      />
    </PageShell>
  )
}
