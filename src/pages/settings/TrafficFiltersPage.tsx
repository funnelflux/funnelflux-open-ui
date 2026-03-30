import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, RotateCcw, Trash2, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { RowActionsMenu } from '@/components/shared/RowActionsMenu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
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
  const toast = useToast()
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

  const columns: ColumnDef<TrafficFilter, unknown>[] = [
    {
      accessorKey: 'trafficFilterName',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.trafficFilterName}</span>
      ),
    },
    {
      accessorKey: 'filterType',
      header: 'Type',
      cell: ({ row }) => FILTER_TYPE_LABELS[row.original.filterType] ?? row.original.filterType,
    },
    {
      id: 'entriesCount',
      header: 'Entries',
      cell: ({ row }) => row.original.filterEntries?.length ?? 0,
    },
    {
      accessorKey: 'isEnabled',
      header: 'Enabled',
      cell: ({ row }) => (
        <Switch
          checked={row.original.isEnabled}
          onCheckedChange={() => handleToggleEnabled(row.original)}
        />
      ),
    },
    {
      accessorKey: 'idTrafficFilter',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.idTrafficFilter}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      cell: ({ row }) => (
        <RowActionsMenu
          actions={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => openEdit(row.original),
            },
            {
              label: 'Apply Retroactively',
              icon: RotateCcw,
              onClick: () => handleApplyRetroactively(row.original),
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => setDeleteTarget(row.original),
              destructive: true,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Traffic Filters"
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Filter
          </Button>
        }
      />

      {!isLoading && (!filters || filters.length === 0) ? (
        <EmptyState
          icon={<Shield className="h-10 w-10" />}
          message="No traffic filters configured."
          actionLabel="Add Filter"
          onAction={openCreate}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filters ?? []}
          isLoading={isLoading}
          getRowId={(row) => row.idTrafficFilter}
        />
      )}

      <TrafficFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialData={editingFilter}
        onSubmit={handleSubmit}
        isSubmitting={saveFilter.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Traffic Filter"
        description={`Are you sure you want to delete "${deleteTarget?.trafficFilterName}"? This cannot be undone.`}
        confirmText="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// --- Sheet form for create/edit ---

interface TrafficFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TrafficFilter
  onSubmit: (data: TrafficFilterFormData) => void
  isSubmitting?: boolean
}

function TrafficFilterSheet({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: TrafficFilterSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {initialData ? 'Edit Traffic Filter' : 'New Traffic Filter'}
          </SheetTitle>
          <SheetDescription>
            {initialData
              ? 'Update the filter configuration below.'
              : 'Configure a new traffic filter.'}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 mt-6"
        >
          <div className="space-y-2">
            <Label htmlFor="trafficFilterName">Name</Label>
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
            <Label>Filter Type</Label>
            <Controller
              control={form.control}
              name="filterType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {FILTER_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.filterType && (
              <p className="text-xs text-destructive">
                {form.formState.errors.filterType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="filterEntries">Entries (one per line)</Label>
            <Textarea
              id="filterEntries"
              value={entriesText}
              onChange={(e) => handleEntriesChange(e.target.value)}
              placeholder="Enter one entry per line"
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirectToURL">Redirect URL (optional)</Label>
            <Input
              id="redirectToURL"
              {...form.register('redirectToURL')}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isEnabled">Enabled</Label>
            <Controller
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <Switch
                  id="isEnabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Save' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
