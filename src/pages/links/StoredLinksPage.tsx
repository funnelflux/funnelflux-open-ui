import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, Input, Modal, PageShell, ConfirmModal, useToastApi, FormField } from '@/components/ui-kit'
import { DataTable } from '@/components/ui-kit/data-table'
import { editBtnColumn, resetStatsBtnColumn, deleteBtnColumn, entityRowId } from '@/components/ui-kit/data-table'
import {
  useStoredLinks,
  useSaveStoredLink,
  useDeleteStoredLink,
  useResetStoredLink,
} from '@/api/hooks'
import type { StoredLink } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'
import { getHttpUrlError } from '@/lib/validateHttpUrl'

export function StoredLinksPage() {
  const toast = useToastApi()
  const { data: links, isLoading } = useStoredLinks()
  const saveMutation = useSaveStoredLink()
  const deleteMutation = useDeleteStoredLink()
  const resetMutation = useResetStoredLink()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<StoredLink | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formUrlError, setFormUrlError] = useState<string | undefined>()

  function openCreate() {
    setEditingLink(null)
    setFormName('')
    setFormUrl('')
    setFormUrlError(undefined)
    setSheetOpen(true)
  }

  const openEdit = useCallback((link: StoredLink) => {
    setEditingLink(link)
    setFormName(link.name)
    setFormUrl(link.targetURL)
    setFormUrlError(undefined)
    setSheetOpen(true)
  }, [])

  const handleFormUrlChange = useCallback((value: string) => {
    setFormUrl(value)
    setFormUrlError(getHttpUrlError(value))
  }, [])

  const handleFormUrlBlur = useCallback(() => {
    setFormUrlError(getHttpUrlError(formUrl))
  }, [formUrl])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = formName.trim()
    const trimmedUrl = formUrl.trim()
    const urlError = getHttpUrlError(trimmedUrl)
    setFormUrlError(urlError)
    if (!trimmedName || urlError) {
      if (!trimmedName) toast.error('Name is required')
      return
    }

    const payload: Partial<StoredLink> = {
      name: trimmedName,
      targetURL: trimmedUrl,
    }
    if (editingLink) {
      payload.id = editingLink.id
    }

    saveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(editingLink ? 'Link updated' : 'Link created')
        setSheetOpen(false)
        setEditingLink(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  function handleDelete() {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Link deleted')
        setDeleteId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  function handleReset() {
    if (!resetId) return
    resetMutation.mutate(resetId, {
      onSuccess: () => {
        toast.success('Link stats reset')
        setResetId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const columns = useMemo<ColumnDef<StoredLink, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        size: 200,
        cell: (info) => <span className="font-medium">{info.row.original.name}</span>,
      },
      editBtnColumn<StoredLink>((row) => openEdit(row)),
      resetStatsBtnColumn<StoredLink>((row) => setResetId(row.id)),
      deleteBtnColumn<StoredLink>((row) => setDeleteId(row.id)),
      {
        id: 'targetURL',
        header: 'URL',
        accessorKey: 'targetURL',
        meta: { flex: 1 },
        size: 250,
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[300px] block">
            {info.row.original.targetURL}
          </span>
        ),
      },
      {
        id: 'visits',
        header: 'Visits',
        accessorKey: 'visits',
        size: 100,
        meta: { numeric: true },
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.visits ?? 0}</span>
        ),
      },
    ],
    [openEdit],
  )

  return (
    <PageShell
      fillHeight
      title="Stored Links"
      actions={
        <Button type="primary" iconName="plus" onClick={openCreate}>
          Add Link
        </Button>
      }
    >
      <DataTable<StoredLink>
        data={links ?? []}
        columns={columns}
        getRowId={entityRowId}
        loading={isLoading}
        tableConfigKey="stored-links"
        defaultSorting={[{ id: 'name', desc: false }]}
        noPagination
        emptyMessage="No stored links yet. Create one to get started."
      />

      <Modal open={sheetOpen} onCancel={() => setSheetOpen(false)} title={editingLink ? 'Edit Link' : 'Add Link'} footer={null} width={480} destroyOnHidden>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label htmlFor="link-name" className="text-sm font-medium">Name</label>
            <Input
              id="link-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="My tracking link"
            />
          </div>

          <FormField label="URL" htmlFor="link-url" error={formUrlError}>
            <Input
              id="link-url"
              value={formUrl}
              onChange={(e) => handleFormUrlChange(e.target.value)}
              onBlur={handleFormUrlBlur}
              placeholder="https://..."
            />
          </FormField>

          <Button
            type="primary"
            htmlType="submit"
            disabled={saveMutation.isPending}
            loading={saveMutation.isPending}
            block
          >
            {editingLink ? 'Save Changes' : 'Create Link'}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Delete Link"
        description="Are you sure you want to delete this stored link? This action cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />

      {/* Reset Confirm */}
      <ConfirmModal
        open={!!resetId}
        onCancel={() => setResetId(null)}
        title="Reset Link Stats"
        description="Are you sure you want to reset the click stats for this link?"
        confirmText="Reset"
        onConfirm={handleReset}
        loading={resetMutation.isPending}
        danger
      />
    </PageShell>
  )
}
