import { useState, useMemo, useEffect, useRef } from 'react'
import { subDays } from 'date-fns'
import type { ColumnDef, RowSelectionState, Table } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button, Input, Select, Modal } from 'antd'
import {
  PageShell,
  SearchToolbar,
  DataTable,
  FormField,
  ConfirmModal,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
import {
  nameColumn,
  visitsColumn,
  clicksColumn,
  ctrColumn,
  convColumn,
  revenueColumn,
  costColumn,
  plColumn,
  roiColumn,
  idColumn,
  selectionColumn,
  editBtnColumn,
  deleteBtnColumn,
} from '@/components/ui-kit/data-table'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import {
  useSaveOfferSource,
  useDeleteOfferSource,
  useOfferSource,
  useOfferSourceTemplates,
  useLoadOfferSourceTemplate,
} from '@/api/hooks'
import { useEntityGridReport, type EntityGridRow } from '@/api/hooks/useEntityGridReport'
import { offerSourceSchema, type OfferSourceFormData } from '@/schemas/offerSource'
import type { OfferSource } from '@/types/entities'
import { getErrorMessage } from '@/lib/utils'

interface OfferSourceMeta {
  idOfferSource: string
  isArchived?: boolean
}

/** Row type for TanStack columns (`HasName` / `HasCells` require a string index signature). */
type OfferSourceGridRow = EntityGridRow & Record<string, unknown>

const defaultValues: OfferSourceFormData = {
  offerSourceName: '',
  subId: '',
  querySeparator: '&',
  postbackSubId: '',
  postbackTxId: '',
  postbackPayout: '',
  notes: '',
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
          notes: initialData.notes ?? '',
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
    <Modal open={open} onCancel={() => onOpenChange(false)} title={isEditing ? 'Edit Offer Source' : 'Add Offer Source'} footer={null} width={640} destroyOnHidden>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5 pt-4">
        {isEditing && initialData?.idOfferSource && (
          <FormField label="ID">
            <Input value={initialData.idOfferSource} disabled className="font-mono text-xs" />
          </FormField>
        )}

        {!isEditing && templates && templates.length > 0 && (
          <FormField label="Copy from Template">
            <Select onChange={handleLoadTemplate} placeholder="Select a template" className="w-full">
              {templates.map((template) => (
                <Select.Option key={template.id} value={template.id}>
                  {template.name}
                </Select.Option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="Name" htmlFor="offerSourceName" error={errors.offerSourceName?.message}>
          <Input id="offerSourceName" {...register('offerSourceName')} placeholder="Offer source name" />
        </FormField>

        <FormField label="Sub ID Parameter" htmlFor="subId">
          <Input id="subId" {...register('subId')} placeholder="e.g. sub_id" />
        </FormField>

        <FormField label="Query Separator" htmlFor="querySeparator">
          <Input id="querySeparator" {...register('querySeparator')} placeholder="&" />
        </FormField>

        <FormField label="Postback Sub ID" htmlFor="postbackSubId">
          <Input id="postbackSubId" {...register('postbackSubId')} placeholder="Postback sub ID token" />
        </FormField>

        <FormField label="Postback TX ID" htmlFor="postbackTxId">
          <Input id="postbackTxId" {...register('postbackTxId')} placeholder="Postback transaction ID token" />
        </FormField>

        <FormField label="Postback Payout" htmlFor="postbackPayout">
          <Input id="postbackPayout" {...register('postbackPayout')} placeholder="Postback payout token" />
        </FormField>

        <FormField label="Notes" htmlFor="notes">
          <Input.TextArea id="notes" {...register('notes')} placeholder="Optional notes..." rows={3} />
        </FormField>

        {isEditing && initialData && (
          <FormField label="Postback URL">
            <Input
              value={`YOUR_DOMAIN/postback?subid=${initialData.postbackSubId || '{subid}'}&txid=${initialData.postbackTxId || '{txid}'}&payout=${initialData.postbackPayout || '{payout}'}`}
              disabled
              className="font-mono text-xs"
            />
          </FormField>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button htmlType="button" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="primary" htmlType="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function OfferSourcesPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<OfferSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<OfferSourceGridRow> | null>(null)
  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
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
    isLoading,
    reload,
  } = useEntityGridReport<OfferSourceMeta>({
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

  const filtered = useMemo((): OfferSourceGridRow[] => {
    const searchText = search.toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const meta = metaById[row.id]
      const matchesArchive =
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? meta?.isArchived === true : meta?.isArchived !== true)
      return matchesSearch && matchesArchive
    }) as OfferSourceGridRow[]
  }, [archiveStatus, metaById, rows, search])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!isLoading && filtered.length === 0) {
        setTableForChooser(null)
      } else {
        setTableForChooser(tableRef.current)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [isLoading, filtered.length])

  const selectedIds = useMemo(() => Object.keys(rowSelection), [rowSelection])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }

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

  const columnDefs = useMemo<ColumnDef<OfferSourceGridRow, unknown>[]>(() => [
    selectionColumn<OfferSourceGridRow>(),
    nameColumn<OfferSourceGridRow>(),
    editBtnColumn<OfferSourceGridRow>((row) => { setEditId(row.id); setSheetOpen(true) }),
    deleteBtnColumn<OfferSourceGridRow>((row) => setDeleteId(row.id)),
    idColumn<OfferSourceGridRow>(),
    visitsColumn<OfferSourceGridRow>(iVisits),
    clicksColumn<OfferSourceGridRow>(iClicks),
    ctrColumn<OfferSourceGridRow>(iCTR),
    convColumn<OfferSourceGridRow>(iConv),
    revenueColumn<OfferSourceGridRow>(iRevenue),
    costColumn<OfferSourceGridRow>(iCost),
    plColumn<OfferSourceGridRow>(iPL),
    roiColumn<OfferSourceGridRow>(iROI),
  ], [iVisits, iClicks, iCTR, iConv, iRevenue, iCost, iPL, iROI])

  return (
    <PageShell
      fillHeight
      title="Offer Sources"
      actions={<Button type="primary" onClick={handleCreate}>Add Offer Source</Button>}
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search offer sources..."
        filters={<ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />}
        trailing={
          <>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to, preset: null }}
              timezone={tz}
              onChange={(v) => { if (v.from && v.to) setDateRange({ from: v.from, to: v.to }) }}
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        }
        actions={tableForChooser ? <ColumnChooser columns={columnDefs} table={tableForChooser} storageKey="offer-sources" /> : null}
      />

      <DataTable
        data={filtered}
        columns={columnDefs}
        loading={isLoading}
        getRowId={(row) => row.id}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        tableRef={tableRef}
        emptyMessage={search ? 'No offer sources match your search.' : 'No offer sources found.'}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={() => setRowSelection({})}
        onDelete={async () => {
          for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id)
          }
          toast.success('Selected offer sources deleted')
          setRowSelection({})
          reload()
        }}
      />

      <OfferSourceForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        initialData={editId ? editSource ?? null : null}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Delete Offer Source"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />
    </PageShell>
  )
}
