import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColDef } from 'ag-grid-community'
import { Plus, Pencil, RotateCcw, Trash2, Loader2, Shield } from 'lucide-react'
import { Button, Input, Switch, Select, Modal } from 'antd'
import { PageShell, DataGrid, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
import { InlineActions } from '@/components/shared/InlineActions'
import {
  useTrafficFilters,
  useSaveTrafficFilter,
  useDeleteTrafficFilter,
  useApplyTrafficFilterRetroactively,
} from '@/api/hooks/useTrafficFilters'
import { trafficFilterSchema, type TrafficFilterFormData } from '@/schemas/trafficFilter'
import type { TrafficFilter, FilterType } from '@/types/entities'

const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  ipAddresses: 'IP Addresses',
  ipRanges: 'IP Ranges',
  referrers: 'Referrers',
  userAgents: 'User Agents',
  ISPs: 'ISPs',
  countries: 'Countries',
  knownBotsAndSpiders: 'Known Bots & Spiders',
}

const FILTER_TYPES = Object.keys(FILTER_TYPE_LABELS) as FilterType[]

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

  function openEdit(filter: TrafficFilter) {
    setEditingFilter(filter)
    setSheetOpen(true)
  }

  function handleApplyRetroactively(filter: TrafficFilter) {
    applyRetro.mutate(filter.idTrafficFilter, {
      onSuccess: () => {
        toast.success(`Filter "${filter.trafficFilterName}" applied retroactively`)
      },
      onError: (err) => {
        toast.error(`Failed to apply filter: ${(err as Error).message}`)
      },
    })
  }

  function handleToggleEnabled(filter: TrafficFilter) {
    saveFilter.mutate(
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
  }

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

  const columns: ColDef<TrafficFilter>[] = [
    {
      colId: 'trafficFilterName',
      headerName: 'Name',
      field: 'trafficFilterName',
      cellRenderer: (params: { data: TrafficFilter }) => (
        <span className="font-medium">{params.data.trafficFilterName}</span>
      ),
    },
    {
      colId: 'filterType',
      headerName: 'Type',
      field: 'filterType',
      valueFormatter: (params: { value: FilterType }) =>
        FILTER_TYPE_LABELS[params.value] ?? params.value,
    },
    {
      colId: 'entriesCount',
      headerName: 'Entries',
      valueGetter: (params: { data: TrafficFilter | undefined }) =>
        params.data?.filterEntries?.length ?? 0,
    },
    {
      colId: 'isEnabled',
      headerName: 'Enabled',
      field: 'isEnabled',
      cellRenderer: (params: { data: TrafficFilter }) => (
        <Switch
          checked={params.data.isEnabled}
          onChange={() => handleToggleEnabled(params.data)}
        />
      ),
    },
    {
      colId: 'idTrafficFilter',
      headerName: 'ID',
      field: 'idTrafficFilter',
      cellRenderer: (params: { data: TrafficFilter }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {params.data.idTrafficFilter}
        </span>
      ),
    },
    {
      colId: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      cellRenderer: (params: { data: TrafficFilter }) => (
        <InlineActions
          actions={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => openEdit(params.data),
            },
            {
              label: 'Apply Retroactively',
              icon: RotateCcw,
              onClick: () => handleApplyRetroactively(params.data),
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => setDeleteTarget(params.data),
              destructive: true,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageShell
      title="Traffic Filters"
      actions={
        <Button type="primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Filter
        </Button>
      }
    >
      {!isLoading && (!filters || filters.length === 0) ? (
        <EmptyState
          icon={<Shield className="h-10 w-10" />}
          message="No traffic filters configured."
          actionLabel="Add Filter"
          onAction={openCreate}
        />
      ) : (
        <DataGrid<TrafficFilter>
          rowData={filters ?? []}
          columnDefs={columns}
          getRowId={(p) => p.data.idTrafficFilter}
          loading={isLoading}
        />
      )}

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

interface TrafficFilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TrafficFilter
  onSubmit: (data: TrafficFilterFormData) => void
  isSubmitting?: boolean
}

function TrafficFilterModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: TrafficFilterModalProps) {
  const form = useForm<TrafficFilterFormData>({
    resolver: zodResolver(trafficFilterSchema),
    defaultValues: {
      idTrafficFilter: '',
      trafficFilterName: '',
      filterType: 'ipAddresses',
      filterEntries: [],
      redirectToURL: null,
      isEnabled: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          idTrafficFilter: initialData.idTrafficFilter,
          trafficFilterName: initialData.trafficFilterName,
          filterType: initialData.filterType,
          filterEntries: initialData.filterEntries ?? [],
          redirectToURL: initialData.redirectToURL,
          isEnabled: initialData.isEnabled,
        })
      } else {
        form.reset({
          idTrafficFilter: '',
          trafficFilterName: '',
          filterType: 'ipAddresses',
          filterEntries: [],
          redirectToURL: null,
          isEnabled: true,
        })
      }
    }
  }, [open, initialData, form])

  // Convert entries array to/from newline-separated text for the textarea
  const entriesText = (form.watch('filterEntries') ?? []).join('\n')

  function handleEntriesChange(text: string) {
    const entries = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    form.setValue('filterEntries', entries, { shouldDirty: true })
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      title={initialData ? 'Edit Traffic Filter' : 'New Traffic Filter'}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 pt-4"
      >
        <div className="space-y-2">
          <label htmlFor="trafficFilterName" className="block text-sm font-medium text-foreground">Name</label>
          <Input
            id="trafficFilterName"
            {...form.register('trafficFilterName')}
            placeholder="Filter name"
          />
          {form.formState.errors.trafficFilterName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.trafficFilterName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Filter Type</label>
          <Controller
            control={form.control}
            name="filterType"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                className="w-full"
                placeholder="Select type"
                options={FILTER_TYPES.map((type) => ({
                  value: type,
                  label: FILTER_TYPE_LABELS[type],
                }))}
              />
            )}
          />
          {form.formState.errors.filterType && (
            <p className="text-xs text-destructive">
              {form.formState.errors.filterType.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="filterEntries" className="block text-sm font-medium text-foreground">Entries (one per line)</label>
          <Input.TextArea
            id="filterEntries"
            value={entriesText}
            onChange={(e) => handleEntriesChange(e.target.value)}
            placeholder="Enter one entry per line"
            rows={8}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="redirectToURL" className="block text-sm font-medium text-foreground">Redirect URL (optional)</label>
          <Input
            id="redirectToURL"
            {...form.register('redirectToURL')}
            placeholder="https://example.com"
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="isEnabled" className="text-sm font-medium">Enabled</label>
          <Controller
            control={form.control}
            name="isEnabled"
            render={({ field }) => (
              <Switch
                id="isEnabled"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="primary" htmlType="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Save' : 'Create'}
          </Button>
          <Button
            htmlType="button"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
