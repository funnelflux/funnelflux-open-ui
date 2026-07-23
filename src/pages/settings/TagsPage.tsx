import { useState, useCallback, useMemo } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Button, PageShell, SearchToolbar, ConfirmModal, useToastApi, type PageShellBodyState } from '@/components/ui-kit'
import { DataTable } from '@/components/ui-kit/data-table'
import { editBtnColumn, deleteBtnColumn } from '@/components/ui-kit/data-table'
import { useTags, useSaveTag, useUpdateTag, useDeleteTag } from '@/api/hooks/useTags'
import { TagModal } from '@/components/forms/TagModal'
import { getErrorMessage } from '@/lib/utils'
import type { Tag } from '@/types/entities'

function visitorTagRowId(row: Tag): string {
  return row.id
}

const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]

export function TagsPage() {
  const toast = useToastApi()
  const { data: tags, isLoading, isError, error, refetch, isFetching } = useTags()
  const saveTag = useSaveTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)

  const filteredTags = useMemo(() => {
    const list = tags ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((tag) => tag.name.toLowerCase().includes(needle))
  }, [tags, search])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  function openCreate() {
    setEditingTag(undefined)
    setSheetOpen(true)
  }

  const openEdit = useCallback((tag: Tag) => {
    setEditingTag(tag)
    setSheetOpen(true)
  }, [])

  const handleCreate = useCallback(
    (input: string) => {
      saveTag.mutate(input, {
        onSuccess: () => {
          toast.success('Tags added')
          setSheetOpen(false)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err))
        },
      })
    },
    [saveTag, toast],
  )

  const handleUpdate = useCallback(
    (idTag: string, name: string) => {
      updateTag.mutate(
        { idTag, name },
        {
          onSuccess: () => {
            toast.success('Tag updated')
            setSheetOpen(false)
          },
          onError: (err) => {
            toast.error(getErrorMessage(err))
          },
        },
      )
    },
    [toast, updateTag],
  )

  function confirmDelete() {
    if (!deleteTarget) return
    deleteTag.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Tag "${deleteTarget.name}" deleted`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(getErrorMessage(err))
        setDeleteTarget(null)
      },
    })
  }

  const columns = useMemo<ColumnDef<Tag, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Tag name',
        accessorKey: 'name',
        size: 420,
        minSize: 280,
        maxSize: 640,
        meta: { flex: 1 },
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      editBtnColumn<Tag>((row) => openEdit(row)),
      deleteBtnColumn<Tag>((row) => setDeleteTarget(row)),
      {
        id: 'id',
        header: 'ID',
        accessorKey: 'id',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
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
      title="Visitor Tags"
      fillHeight
      bodyState={bodyState}
      actions={
        <Button type="primary" iconName="plus" onClick={openCreate}>
          Add Tags
        </Button>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search tags..."
        onRefresh={handleRefresh}
        refreshLoading={isFetching}
      />

      <DataTable<Tag>
        data={filteredTags}
        columns={columns}
        getRowId={visitorTagRowId}
        loading={isLoading}
        tableConfigKey="settings-visitor-tags"
        defaultSorting={DEFAULT_SORTING}
        noPagination
        emptyMessage={search ? 'No tags match your search.' : 'No tags yet. Add some with the button above.'}
      />

      <TagModal
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingTag={editingTag}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        isSubmitting={saveTag.isPending || updateTag.isPending}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Visitor Tag"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This removes the tag from the catalog and funnel visitor-tag nodes. Visitor assignment rows for this tag are cleared. Historical stats are not rewritten.`
            : ''
        }
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteTag.isPending}
      />
    </PageShell>
  )
}
