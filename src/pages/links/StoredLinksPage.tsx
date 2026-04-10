import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, RotateCcw, Loader2 } from 'lucide-react'
import { Button, Input, Modal } from 'antd'
import { PageShell, DataTable, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
import { InlineActions } from '@/components/shared/InlineActions'
import {
  useStoredLinks,
  useSaveStoredLink,
  useDeleteStoredLink,
  useResetStoredLink,
} from '@/api/hooks'
import type { StoredLink } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

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

  function openCreate() {
    setEditingLink(null)
    setFormName('')
    setFormUrl('')
    setSheetOpen(true)
  }

  const openEdit = useCallback((link: StoredLink) => {
    setEditingLink(link)
    setFormName(link.name)
    setFormUrl(link.url)
    setSheetOpen(true)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = formName.trim()
    const trimmedUrl = formUrl.trim()
    if (!trimmedName || !trimmedUrl) {
      toast.error('Name and URL are required')
      return
    }

    const payload: Partial<StoredLink> = {
      name: trimmedName,
      url: trimmedUrl,
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
      {
        id: 'url',
        header: 'URL',
        accessorKey: 'url',
        meta: { flex: 1 },
        size: 250,
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[300px] block">
            {info.row.original.url}
          </span>
        ),
      },
      {
        id: 'clicks',
        header: 'Clicks',
        accessorKey: 'clicks',
        size: 100,
        cell: (info) => (
          <span className="tabular-nums">{info.row.original.clicks ?? 0}</span>
        ),
      },
      {
        id: 'lastClickDate',
        header: 'Last Click',
        accessorKey: 'lastClickDate',
        size: 160,
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {info.row.original.lastClickDate || '--'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        accessorFn: () => '',
        enableSorting: false,
        size: 50,
        cell: (info) => {
          const link = info.row.original
          return (
            <InlineActions
              actions={[
                { label: 'Edit', icon: Pencil, onClick: () => openEdit(link) },
                { label: 'Reset Stats', icon: RotateCcw, onClick: () => setResetId(link.id) },
                {
                  label: 'Delete',
                  icon: Trash2,
                  onClick: () => setDeleteId(link.id),
                  destructive: true,
                },
              ]}
            />
          )
        },
      },
    ],
    [openEdit],
  )

  return (
    <PageShell
      title="Stored Links"
      actions={
        <Button type="primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Link
        </Button>
      }
    >
      {!isLoading && (!links || links.length === 0) ? (
        <EmptyState
          message="No stored links yet. Create one to get started."
          actionLabel="Add Link"
          onAction={openCreate}
        />
      ) : (
        <DataTable<StoredLink>
          data={links ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading}
          noPagination
        />
      )}

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

          <div className="space-y-1.5">
            <label htmlFor="link-url" className="text-sm font-medium">URL</label>
            <Input
              id="link-url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <Button type="primary" htmlType="submit" disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
