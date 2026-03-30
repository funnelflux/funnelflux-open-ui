import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useToast } from '@/components/shared/Toaster'
import {
  useStoredLinks,
  useSaveStoredLink,
  useDeleteStoredLink,
  useResetStoredLink,
} from '@/api/hooks'
import type { StoredLink } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

export function StoredLinksPage() {
  const toast = useToast()
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

  function openEdit(link: StoredLink) {
    setEditingLink(link)
    setFormName(link.name)
    setFormUrl(link.url)
    setSheetOpen(true)
  }

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

  const columns: ColumnDef<StoredLink>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'url',
      header: 'URL',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[300px] block">
          {row.original.url}
        </span>
      ),
    },
    {
      accessorKey: 'clicks',
      header: 'Clicks',
      size: 100,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.clicks ?? 0}</span>
      ),
    },
    {
      accessorKey: 'lastClickDate',
      header: 'Last Click',
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.lastClickDate || '--'}
        </span>
      ),
    },
    {
      id: 'actions',
      size: 50,
      cell: ({ row }) => {
        const link = row.original
        return (
          <RowActionsMenu
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
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Stored Links">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Link
        </Button>
      </PageHeader>

      {!isLoading && (!links || links.length === 0) ? (
        <EmptyState
          message="No stored links yet. Create one to get started."
          actionLabel="Add Link"
          onAction={openCreate}
        />
      ) : (
        <DataTable
          columns={columns}
          data={links ?? []}
          isLoading={isLoading}
          getRowId={(row) => row.id}
        />
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingLink ? 'Edit Link' : 'Add Link'}</SheetTitle>
            <SheetDescription>
              {editingLink
                ? 'Update the stored link details.'
                : 'Create a new stored link for tracking.'}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label htmlFor="link-name">Name</Label>
              <Input
                id="link-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My tracking link"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <Button type="submit" disabled={saveMutation.isPending} className="w-full">
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLink ? 'Save Changes' : 'Create Link'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Link"
        description="Are you sure you want to delete this stored link? This action cannot be undone."
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Reset Confirm */}
      <ConfirmDialog
        open={!!resetId}
        onOpenChange={(open) => { if (!open) setResetId(null) }}
        title="Reset Link Stats"
        description="Are you sure you want to reset the click stats for this link?"
        confirmText="Reset"
        onConfirm={handleReset}
        isLoading={resetMutation.isPending}
      />
    </div>
  )
}
