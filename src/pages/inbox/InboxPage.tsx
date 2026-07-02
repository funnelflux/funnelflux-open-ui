import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import { sanitizeHtml } from '@/lib/sanitize'
import { Button, Modal, SearchToolbar, Tag } from '@/components/ui-kit'
import { DataTable, selectionColumn } from '@/components/ui-kit/data-table'
import { PageShell, ConfirmModal, useToastApi, type PageShellBodyState } from '@/components/ui-kit'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import {
  useInboxMessages,
  useInboxMessage,
  useChangeReadStatus,
  useDeleteInboxMessage,
} from '@/api/hooks/useInbox'
import type { InboxMessage } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

function inboxMessageRowId(row: InboxMessage): string {
  return row.id
}

export function InboxPage() {
  const toast = useToastApi()
  const { data: messages, isLoading, isFetching, isError, error, refetch } = useInboxMessages()
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const { data: fullMessage, isLoading: isMessageLoading } = useInboxMessage(selectedMessageId ?? '')
  const changeReadStatus = useChangeReadStatus()
  const deleteMessage = useDeleteInboxMessage()

  const [search, setSearch] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [deleteTarget, setDeleteTarget] = useState<InboxMessage | null>(null)

  const selectedIds = useMemo(
    () => Object.entries(rowSelection).filter(([, selected]) => selected).map(([id]) => id),
    [rowSelection],
  )

  const filteredMessages = useMemo(() => {
    const list = messages ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((message) =>
      `${message.from} ${message.title} ${message.body}`.toLowerCase().includes(needle),
    )
  }, [messages, search])

  const openMessage = useCallback((message: InboxMessage) => {
    setSelectedMessageId(message.id)
    if (message.alreadyRead) return
    changeReadStatus.mutate({ ids: [message.id], isRead: true })
  }, [changeReadStatus])

  const toggleReadStatus = useCallback((message: InboxMessage) => {
    changeReadStatus.mutate(
      { ids: [message.id], isRead: !message.alreadyRead },
      {
        onSuccess: () => {
          toast.success(message.alreadyRead ? 'Marked as unread' : 'Marked as read')
        },
        onError: (err) => {
          toast.error(`Failed to update status: ${(err as Error).message}`)
        },
      },
    )
  }, [changeReadStatus, toast])

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMessage.mutate([deleteTarget.id], {
      onSuccess: () => {
        toast.success('Message deleted')
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(`Failed to delete message: ${(err as Error).message}`)
        setDeleteTarget(null)
      },
    })
  }

  function formatDate(timestamp: number) {
    try {
      return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return String(timestamp)
    }
  }

  const bulkSetReadStatus = useCallback(async (isRead: boolean) => {
    if (selectedIds.length === 0) return
    try {
      await changeReadStatus.mutateAsync({ ids: selectedIds, isRead })
      toast.success(
        `Marked ${selectedIds.length} message${selectedIds.length === 1 ? '' : 's'} as ${isRead ? 'read' : 'unread'}`,
      )
      setRowSelection({})
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [selectedIds, toast, changeReadStatus])

  const bulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    try {
      await deleteMessage.mutateAsync(selectedIds)
      toast.success(`Deleted ${selectedIds.length} message${selectedIds.length === 1 ? '' : 's'}`)
      setRowSelection({})
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [selectedIds, deleteMessage, toast])

  const bulkExtraActions = useMemo(
    () => [
      { key: 'mark-read', label: 'Mark as read', onAction: () => bulkSetReadStatus(true) },
      { key: 'mark-unread', label: 'Mark as unread', onAction: () => bulkSetReadStatus(false) },
    ],
    [bulkSetReadStatus],
  )

  const columns = useMemo<ColumnDef<InboxMessage, unknown>[]>(
    () => [
      selectionColumn<InboxMessage>(),
      {
        id: 'from',
        header: 'From',
        accessorKey: 'from',
        size: 180,
      },
      {
        id: 'message',
        header: 'Message',
        accessorFn: (row) => `${row.title} ${row.body}`,
        size: 640,
        minSize: 420,
        meta: { flex: 1 },
        cell: ({ row }) => (
          <button
            type="button"
            className="w-full text-left"
            onClick={() => openMessage(row.original)}
          >
            <div className="flex items-center gap-2">
              <span className={row.original.alreadyRead ? 'text-sm text-muted-foreground' : 'text-sm font-semibold'}>
                {row.original.title}
              </span>
              {!row.original.alreadyRead ? (
                <Tag color="blue" className="text-[10px] px-1.5 py-0">Unread</Tag>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground truncate">{row.original.body}</div>
          </button>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        accessorKey: 'timestamp',
        size: 180,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{formatDate(row.original.timestamp)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 120,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="text"
              iconName={row.original.alreadyRead ? 'mail' : 'mail-open'}
              iconSize="sm"
              onClick={() => toggleReadStatus(row.original)}
              title={row.original.alreadyRead ? 'Mark as unread' : 'Mark as read'}
            />
            <Button
              type="text"
              className="text-destructive hover:text-destructive"
              iconName="trash-2"
              iconSize="sm"
              onClick={() => setDeleteTarget(row.original)}
              title="Delete"
            />
          </div>
        ),
      },
    ],
    [openMessage, toggleReadStatus],
  )

  const bodyState: PageShellBodyState = isError
    ? {
        status: 'error',
        message: getErrorMessage(error),
        onRetry: () => void refetch(),
      }
    : { status: 'ready' }

  return (
    <PageShell title="Inbox" bodyState={bodyState}>
      <div className="space-y-3">
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search..."
          onRefresh={() => void refetch()}
          refreshLoading={isFetching}
        />

        <BulkActionsBar
          count={selectedIds.length}
          onDeselectAll={() => setRowSelection({})}
          onDelete={bulkDelete}
          deleteConfirmTitle={`Delete ${selectedIds.length} Message${selectedIds.length === 1 ? '' : 's'}`}
          deleteConfirmDescription={`Are you sure you want to permanently delete ${selectedIds.length} selected message${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`}
          extraActions={bulkExtraActions}
        />

        <DataTable<InboxMessage>
          data={filteredMessages}
          columns={columns}
          getRowId={inboxMessageRowId}
          loading={isLoading}
          tableConfigKey="inbox-messages"
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          emptyMessage="No messages."
        />
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Message"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Delete"
        danger
        loading={deleteMessage.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal
        open={!!selectedMessageId}
        title={fullMessage?.title ?? 'Message'}
        onCancel={() => setSelectedMessageId(null)}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button
              type="default"
              onClick={() => {
                if (!selectedMessageId) return
                changeReadStatus.mutate(
                  { ids: [selectedMessageId], isRead: false },
                  {
                    onSuccess: () => {
                      toast.success('Marked as unread')
                      setSelectedMessageId(null)
                    },
                    onError: (err) => toast.error(getErrorMessage(err)),
                  },
                )
              }}
            >
              Mark as unread
            </Button>
            <Button onClick={() => setSelectedMessageId(null)}>Close</Button>
          </div>
        )}
        width={760}
        destroyOnHidden
      >
        {isMessageLoading ? (
          <p className="text-sm text-muted-foreground">Loading message...</p>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              From {fullMessage?.from ?? '-'} - {fullMessage ? formatDate(fullMessage.timestamp) : '-'}
            </div>
            <div
              className="prose prose-sm max-w-none text-sm text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(fullMessage?.body ?? '') }}
            />
          </div>
        )}
      </Modal>
    </PageShell>
  )
}
