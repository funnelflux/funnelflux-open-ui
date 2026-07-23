import { useState, useCallback, useMemo } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Button, Switch, PageShell, SearchToolbar, ConfirmModal, useToastApi, type PageShellBodyState, type SelectOption } from '@/components/ui-kit'
import { DataTable } from '@/components/ui-kit/data-table'
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

const DEFAULT_SORTING: SortingState = [{ id: 'trafficFilterName', desc: false }]

export function TrafficFiltersPage() {
  const toast = useToastApi()
  const { data: trafficFiltersData, isLoading, isError, error, refetch, isFetching } = useTrafficFilters()
  const saveFilter = useSaveTrafficFilter()
  const deleteFilter = useDeleteTrafficFilter()
  const applyRetro = useApplyTrafficFilterRetroactively()

  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingFilter, setEditingFilter] = useState<TrafficFilter | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TrafficFilter | null>(null)
  const [retroTarget, setRetroTarget] = useState<TrafficFilter | null>(null)

  const filters = useMemo(() => {
    const list = trafficFiltersData?.filters ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((filter) => filter.trafficFilterName.toLowerCase().includes(needle))
  }, [trafficFiltersData?.filters, search])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

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
    const shouldApplyFilter = Boolean(retroTarget.isEnabled)
    applyRetroMutate({ idTrafficFilter: retroTarget.idTrafficFilter, apply: shouldApplyFilter }, {
      onSuccess: () => {
        toast.success(
          shouldApplyFilter
            ? `Filter "${retroTarget.trafficFilterName}" applied retroactively`
            : `Filter "${retroTarget.trafficFilterName}" removed retroactively`,
        )
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

  const bodyState: PageShellBodyState = isError
    ? {
        status: 'error',
        message: getErrorMessage(error),
        onRetry: () => void refetch(),
      }
    : { status: 'ready' }

  return (
    <PageShell fillHeight
      title="Traffic Filters"
      bodyState={bodyState}
      actions={
        <Button type="primary" iconName="plus" onClick={openCreate}>
          Add Filter
        </Button>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search traffic filters..."
        onRefresh={handleRefresh}
        refreshLoading={isFetching}
      />

      <DataTable<TrafficFilter>
        data={filters}
        columns={columns}
        getRowId={trafficFilterRowId}
        loading={isLoading}
        tableConfigKey="settings-traffic-filters"
        defaultSorting={DEFAULT_SORTING}
        noPagination
        emptyMessage={search ? 'No traffic filters match your search.' : 'No traffic filters configured.'}
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
        title={retroTarget?.isEnabled ? 'Apply filter retroactively' : 'Unfilter retroactively'}
        description={
          retroTarget
            ? retroTarget.isEnabled
              ? `Apply "${retroTarget.trafficFilterName}" to historical stats? This is a destructive data operation similar to Reset Stats.`
              : `Remove "${retroTarget.trafficFilterName}" from historical filtered stats? This is a destructive data operation similar to Reset Stats.`
            : ''
        }
        confirmText={retroTarget?.isEnabled ? 'Apply' : 'Unfilter'}
        danger
        loading={applyRetro.isPending}
        onConfirm={runApplyRetroactively}
        onCancel={() => setRetroTarget(null)}
      />
    </PageShell>
  )
}
