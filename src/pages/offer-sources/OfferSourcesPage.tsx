import { useState, useMemo, useEffect } from 'react'
import { subDays } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RowActionsMenu } from '@/components/shared/RowActionsMenu'
import { SearchInput } from '@/components/shared/SearchInput'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { TimezoneSelector } from '@/components/shared/TimezoneSelector'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import { useToast } from '@/components/shared/Toaster'
import {
  useSaveOfferSource,
  useDeleteOfferSource,
  useOfferSource,
  useOfferSourceTemplates,
  useLoadOfferSourceTemplate,
} from '@/api/hooks'
import { useEntityPaginatedReport, type EntityRow } from '@/api/hooks/useEntityPaginatedReport'
import { offerSourceSchema, type OfferSourceFormData } from '@/schemas/offerSource'
import type { ReportCell } from '@/types/stats'
import type { OfferSource } from '@/types/entities'
import { getErrorMessage } from '@/lib/utils'

function cellFmt(cell?: ReportCell): string {
  return cell?.formatted ?? ''
}
function cellRaw(cell?: ReportCell): number {
  if (!cell) return 0
  return typeof cell.raw === 'number' ? cell.raw : Number(cell.raw) || 0
}

interface OfferSourceMeta {
  idOfferSource: string
  isArchived?: boolean
}

const defaultValues: OfferSourceFormData = {
  offerSourceName: '',
  subId: '',
  querySeparator: '&',
  postbackSubId: '',
  postbackTxId: '',
  postbackPayout: '',
}

function OfferSourceForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: OfferSource | null | undefined
  onSubmit: (data: OfferSourceFormData) => void
  isSubmitting?: boolean
}) {
  const { data: templates } = useOfferSourceTemplates(open)
  const loadTemplate = useLoadOfferSourceTemplate()
  const isEditing = !!initialData?.idOfferSource

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferSourceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(offerSourceSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          idOfferSource: initialData.idOfferSource,
          offerSourceName: initialData.offerSourceName,
          subId: initialData.subId ?? '',
          querySeparator: initialData.querySeparator ?? '&',
          postbackSubId: initialData.postbackSubId ?? '',
          postbackTxId: initialData.postbackTxId ?? '',
          postbackPayout: initialData.postbackPayout ?? '',
          isArchived: initialData.isArchived,
        })
      } else {
        reset(defaultValues)
      }
    }
  }, [open, initialData, reset])

  const handleLoadTemplate = (templateId: string) => {
    loadTemplate.mutate(templateId, {
      onSuccess: (data) => {
        reset({
          ...defaultValues,
          offerSourceName: data.offerSourceName,
          subId: data.subId ?? '',
          querySeparator: data.querySeparator ?? '&',
          postbackSubId: data.postbackSubId ?? '',
          postbackTxId: data.postbackTxId ?? '',
          postbackPayout: data.postbackPayout ?? '',
        })
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Offer Source' : 'Add Offer Source'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the offer source configuration.' : 'Create a new offer source.'}
          </SheetDescription>
        </SheetHeader>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5 mt-6">
          {/* Load Template */}
          {!isEditing && templates && templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Copy from Template</Label>
              <Select onValueChange={handleLoadTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="offerSourceName">Name</Label>
            <Input
              id="offerSourceName"
              {...register('offerSourceName')}
              placeholder="Offer source name"
            />
            {errors.offerSourceName && (
              <p className="text-xs text-destructive">{errors.offerSourceName.message}</p>
            )}
          </div>

          {/* Sub ID */}
          <div className="space-y-1.5">
            <Label htmlFor="subId">Sub ID Parameter</Label>
            <Input
              id="subId"
              {...register('subId')}
              placeholder="e.g. sub_id"
            />
          </div>

          {/* Query Separator */}
          <div className="space-y-1.5">
            <Label htmlFor="querySeparator">Query Separator</Label>
            <Input
              id="querySeparator"
              {...register('querySeparator')}
              placeholder="&"
            />
          </div>

          {/* Postback Sub ID */}
          <div className="space-y-1.5">
            <Label htmlFor="postbackSubId">Postback Sub ID</Label>
            <Input
              id="postbackSubId"
              {...register('postbackSubId')}
              placeholder="Postback sub ID token"
            />
          </div>

          {/* Postback TX ID */}
          <div className="space-y-1.5">
            <Label htmlFor="postbackTxId">Postback TX ID</Label>
            <Input
              id="postbackTxId"
              {...register('postbackTxId')}
              placeholder="Postback transaction ID token"
            />
          </div>

          {/* Postback Payout */}
          <div className="space-y-1.5">
            <Label htmlFor="postbackPayout">Postback Payout</Label>
            <Input
              id="postbackPayout"
              {...register('postbackPayout')}
              placeholder="Postback payout token"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function OfferSourcesPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  const { data: editSource } = useOfferSource(editId ?? '')
  const saveMutation = useSaveOfferSource()
  const deleteMutation = useDeleteOfferSource()

  const {
    rows,
    columns,
    metaById,
    totalRows,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    isLoading,
    reload,
  } = useEntityPaginatedReport<OfferSourceMeta>({
    groupBy: 'Third Parties: Offer Source',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    metaEndpoint: '/data/offersource/list/',
    metaIdKey: 'idOfferSource',
  })

  const colMap = useMemo(() => {
    const m = new Map<string, number>()
    columns.forEach((c, i) => m.set(c.name, i))
    return m
  }, [columns])

  const filtered = useMemo(() => {
    const searchText = search.toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const meta = metaById[row.id]
      const matchesArchive =
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? meta?.isArchived === true : meta?.isArchived !== true)
      return matchesSearch && matchesArchive
    })
  }, [archiveStatus, metaById, rows, search])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }
  const handleEdit = (id: string) => { setEditId(id); setSheetOpen(true) }

  const handleSubmit = (data: OfferSourceFormData) => {
    saveMutation.mutate(data as unknown as Partial<OfferSource>, {
      onSuccess: () => {
        toast.success(editId ? 'Offer source updated' : 'Offer source created')
        setSheetOpen(false)
        setEditId(null)
        reload()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast.success('Deleted'); setDeleteId(null); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const iVisits = colMap.get('Entrances') ?? 1
  const iClicks = colMap.get('Lander Clicks') ?? 6
  const iCTR = colMap.get('Lander CTR') ?? 7
  const iConv = colMap.get('Conv.') ?? 17
  const iRevenue = colMap.get('Revenue') ?? 28
  const iCost = colMap.get('Cost') ?? 31
  const iPL = colMap.get('P/L') ?? 32
  const iROI = colMap.get('ROI') ?? 33

  const tableCols: ColumnDef<EntityRow>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (r) => r.name,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'visits',
      header: 'Visits',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iVisits]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iVisits])}</span>,
    },
    {
      id: 'clicks',
      header: 'Clicks',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iClicks]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iClicks])}</span>,
    },
    {
      id: 'ctr',
      header: 'CTR',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iCTR]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iCTR])}</span>,
    },
    {
      id: 'conv',
      header: 'Conv',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iConv]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iConv])}</span>,
    },
    {
      id: 'revenue',
      header: 'Revenue',
      size: 90,
      accessorFn: (r) => cellRaw(r.cells[iRevenue]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iRevenue])}</span>,
    },
    {
      id: 'cost',
      header: 'Cost',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iCost]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iCost])}</span>,
    },
    {
      id: 'pl',
      header: 'P/L',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iPL]),
      cell: ({ row }) => {
        const val = cellRaw(row.original.cells[iPL])
        return (
          <span className={`tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : ''}`}>
            {cellFmt(row.original.cells[iPL])}
          </span>
        )
      },
    },
    {
      id: 'roi',
      header: 'ROI',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iROI]),
      cell: ({ row }) => {
        const val = cellRaw(row.original.cells[iROI])
        return (
          <span className={`tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : ''}`}>
            {cellFmt(row.original.cells[iROI])}
          </span>
        )
      },
    },
    {
      id: 'id',
      header: 'ID',
      size: 160,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      id: 'actions',
      size: 50,
      cell: ({ row }) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => handleEdit(row.original.id) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeleteId(row.original.id), destructive: true },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Offer Sources">
        <Button onClick={handleCreate} size="sm">Add Offer Source</Button>
      </PageHeader>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search offer sources..." className="w-64" />
        <ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />
        <DateRangePicker
          value={{ from: dateRange.from, to: dateRange.to, preset: null }}
          timezone={tz}
          onChange={(v) => { if (v.from && v.to) setDateRange({ from: v.from, to: v.to }) }}
        />
        <TimezoneSelector value={tz} onChange={setTz} />
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState message={search ? 'No offer sources match your search.' : 'No offer sources found.'} />
      ) : (
        <DataTable
          columns={tableCols}
          data={filtered}
          isLoading={isLoading}
          totalRows={totalRows}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          sorting={sorting}
          onSortingChange={onSortingChange}
          manualPagination
          manualSorting
          getRowId={(r) => r.id}
        />
      )}

      <OfferSourceForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        initialData={editId ? editSource ?? null : null}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Offer Source"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
