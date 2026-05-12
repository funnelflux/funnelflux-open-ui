import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import { sanitizeHtml } from '@/lib/sanitize'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input, Modal, Select, Tag } from '@/components/ui-kit'
import { DataTable, selectionColumn } from '@/components/ui-kit/data-table'
import { PageShell, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
import {
  useInboxMessages,
  useInboxMessage,
  useChangeReadStatus,
  useDeleteInboxMessage,
} from '@/api/hooks/useInbox'
import type { InboxMessage } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

export function InboxPage() {
  const toast = useToastApi()
  const { data: messages, isLoading } = useInboxMessages()
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const { data: fullMessage, isLoading: isMessageLoading } = useInboxMessage(selectedMessageId ?? '')
  const changeReadStatus = useChangeReadStatus()
  const deleteMessage = useDeleteInboxMessage()

  const [search, setSearch] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkAction, setBulkAction] = useState<'read' | 'unread' | 'delete'>('read')
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

  const applyBulkAction = useCallback(async () => {
    if (selectedIds.length === 0) return

    try {
      if (bulkAction === 'delete') {
        await deleteMessage.mutateAsync(selectedIds)
        toast.success(`Deleted ${selectedIds.length} message${selectedIds.length === 1 ? '' : 's'}`)
      } else {
        const isRead = bulkAction === 'read'
        await changeReadStatus.mutateAsync({ ids: selectedIds, isRead })
        toast.success(
          isRead
            ? `Marked ${selectedIds.length} message${selectedIds.length === 1 ? '' : 's'} as read`
            : `Marked ${selectedIds.length} message${selectedIds.length === 1 ? '' : 's'} as unread`,
        )
      }
      setRowSelection({})
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [selectedIds, bulkAction, deleteMessage, toast, changeReadStatus])

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

  return (
    <PageShell title="Inbox">
      {isLoading && <p className="text-sm text-muted-foreground">Loading messages...</p>}

      {!isLoading && (!messages || messages.length === 0) && (
        <EmptyState
          icon={
            <span className="inline-flex [&>svg]:h-10 [&>svg]:w-10">
              <Icon name="inbox" size="lg" />
            </span>
          }
          message="No messages in your inbox."
        />
      )}

      {messages && messages.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select
                value={bulkAction}
                onChange={(value) => setBulkAction((value as 'read' | 'unread' | 'delete') ?? 'read')}
                options={[
                  { value: 'read', label: 'Mark as read' },
                  { value: 'unread', label: 'Mark as unread' },
                  { value: 'delete', label: 'Delete' },
                ]}
              />
            </div>
            <Button
              onClick={() => {
                void applyBulkAction()
              }}
              disabled={selectedIds.length === 0}
            >
              Apply
            </Button>
            <div className="w-64">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
              />
            </div>
          </div>

          <DataTable<InboxMessage>
            data={filteredMessages}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            tableConfigKey="inbox-messages"
            enableRowSelection
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            emptyMessage="No messages."
          />
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Message"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal
        open={!!selectedMessageId}
        title={fullMessage?.title ?? 'Message'}
        onCancel={() => setSelectedMessageId(null)}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setSelectedMessageId(null)}>OK</Button>
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
