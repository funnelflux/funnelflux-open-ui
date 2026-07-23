import { useState, useMemo, useCallback, useId } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Button, Input, FormModal, FormModalBody, FormModalFooter, FormModalHeader, PageShell, SearchToolbar, ConfirmModal, useToastApi, FormField, type PageShellBodyState } from '@/components/ui-kit'
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

const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]

export function StoredLinksPage() {
  const toast = useToastApi()
  const { data: links, isLoading, isError, error, refetch, isFetching } = useStoredLinks()
  const saveMutation = useSaveStoredLink()
  const deleteMutation = useDeleteStoredLink()
  const resetMutation = useResetStoredLink()

  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<StoredLink | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)

  const filteredLinks = useMemo(() => {
    const list = links ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((link) => `${link.name} ${link.targetURL}`.toLowerCase().includes(needle))
  }, [links, search])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  // Form state
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formUrlError, setFormUrlError] = useState<string | undefined>()
  const formId = useId()

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

  const bodyState: PageShellBodyState = isError
    ? {
        status: 'error',
        message: getErrorMessage(error),
        onRetry: () => void refetch(),
      }
    : { status: 'ready' }

  return (
    <PageShell
      fillHeight
      title="Stored Links"
      bodyState={bodyState}
      actions={
        <Button type="primary" iconName="plus" onClick={openCreate}>
          Add Link
        </Button>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search stored links..."
        onRefresh={handleRefresh}
        refreshLoading={isFetching}
      />

      <DataTable<StoredLink>
        data={filteredLinks}
        columns={columns}
        getRowId={entityRowId}
        loading={isLoading}
        tableConfigKey="stored-links"
        defaultSorting={DEFAULT_SORTING}
        noPagination
        emptyMessage={search ? 'No stored links match your search.' : 'No stored links yet. Create one to get started.'}
      />

      <FormModal open={sheetOpen} onCancel={() => setSheetOpen(false)} width={480} destroyOnHidden>
        <FormModalHeader title={editingLink ? 'Edit Link' : 'Add Link'} />
        <FormModalBody>
          <form id={formId} onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Name" htmlFor="link-name">
              <Input
                id="link-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My tracking link"
              />
            </FormField>

            <FormField label="URL" htmlFor="link-url" error={formUrlError}>
              <Input
                id="link-url"
                value={formUrl}
                onChange={(e) => handleFormUrlChange(e.target.value)}
                onBlur={handleFormUrlBlur}
                placeholder="https://..."
              />
            </FormField>
          </form>
        </FormModalBody>
        <FormModalFooter>
          <Button htmlType="button" disabled={saveMutation.isPending} onClick={() => setSheetOpen(false)}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            form={formId}
            loading={saveMutation.isPending}
          >
            {editingLink ? 'Save Changes' : 'Create Link'}
          </Button>
        </FormModalFooter>
      </FormModal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Delete Link"
        description="Are you sure you want to delete this stored link? This action cannot be undone."
        confirmText="Delete"
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
