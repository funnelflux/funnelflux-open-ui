import { useCallback } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Collapse, Tag } from '@/components/ui-kit'
import { PageShell, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
import {
  useInboxMessages,
  useChangeReadStatus,
  useDeleteInboxMessage,
} from '@/api/hooks/useInbox'
import { useState } from 'react'
import type { InboxMessage } from '@/types/ui'

export function InboxPage() {
  const toast = useToastApi()
  const { data: messages, isLoading } = useInboxMessages()
  const changeReadStatus = useChangeReadStatus()
  const deleteMessage = useDeleteInboxMessage()

  const [deleteTarget, setDeleteTarget] = useState<InboxMessage | null>(null)

  const handleCollapseChange = useCallback(
    (keys: string | string[]) => {
      const activeKeys = Array.isArray(keys) ? keys : [keys]
      if (!activeKeys.length || !messages) return
      const lastKey = activeKeys[activeKeys.length - 1]
      const message = messages.find((m) => m.id === lastKey)
      if (message && !message.alreadyRead) {
        changeReadStatus.mutate({ id: message.id, isRead: true })
      }
    },
    [messages, changeReadStatus],
  )

  function toggleReadStatus(message: InboxMessage) {
    changeReadStatus.mutate(
      { id: message.id, isRead: !message.alreadyRead },
      {
        onSuccess: () => {
          toast.success(message.alreadyRead ? 'Marked as unread' : 'Marked as read')
        },
        onError: (err) => {
          toast.error(`Failed to update status: ${(err as Error).message}`)
        },
      },
    )
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMessage.mutate(deleteTarget.id, {
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

  return (
    <PageShell title="Inbox">
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      )}

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
        <Collapse
          accordion
          onChange={handleCollapseChange}
          className="space-y-2"
          items={messages.map((message) => ({
            key: message.id,
            label: (
              <div className="flex flex-1 items-center gap-3 text-left min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        message.alreadyRead
                          ? 'text-sm text-muted-foreground'
                          : 'text-sm font-semibold text-foreground'
                      }
                    >
                      {message.title}
                    </span>
                    {!message.alreadyRead && (
                      <Tag color="blue" className="text-[10px] px-1.5 py-0">
                        New
                      </Tag>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(message.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="text"
                    className="h-7 w-7"
                    icon={message.alreadyRead ? <Icon name="mail" size="sm" /> : <Icon name="mail-open" size="sm" />}
                    onClick={() => toggleReadStatus(message)}
                    title={message.alreadyRead ? 'Mark as unread' : 'Mark as read'}
                  />
                  <Button
                    type="text"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    icon={<Icon name="trash-2" size="sm" />}
                    onClick={() => setDeleteTarget(message)}
                    title="Delete"
                  />
                </div>
              </div>
            ),
            children: (
              <div
                className="prose prose-sm max-w-none text-sm text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body) }}
              />
            ),
          }))}
        />
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
    </PageShell>
  )
}
