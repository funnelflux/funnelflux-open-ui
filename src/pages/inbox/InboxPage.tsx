import { useCallback } from 'react'
import { Mail, MailOpen, Trash2, Inbox } from 'lucide-react'
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
      if (message && !message.isRead) {
        changeReadStatus.mutate({ id: message.id, isRead: true })
      }
    },
    [messages, changeReadStatus],
  )

  function toggleReadStatus(message: InboxMessage) {
    changeReadStatus.mutate(
      { id: message.id, isRead: !message.isRead },
      {
        onSuccess: () => {
          toast.success(message.isRead ? 'Marked as unread' : 'Marked as read')
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

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <PageShell title="Inbox">
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      )}

      {!isLoading && (!messages || messages.length === 0) && (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
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
                        message.isRead
                          ? 'text-sm text-muted-foreground'
                          : 'text-sm font-semibold text-foreground'
                      }
                    >
                      {message.subject}
                    </span>
                    {!message.isRead && (
                      <Tag color="blue" className="text-[10px] px-1.5 py-0">
                        New
                      </Tag>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(message.date)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="text"
                    className="h-7 w-7"
                    icon={message.isRead ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                    onClick={() => toggleReadStatus(message)}
                    title={message.isRead ? 'Mark as unread' : 'Mark as read'}
                  />
                  <Button
                    type="text"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleteTarget(message)}
                    title="Delete"
                  />
                </div>
              </div>
            ),
            children: (
              <div
                className="prose prose-sm max-w-none text-sm text-foreground"
                dangerouslySetInnerHTML={{ __html: message.body }}
              />
            ),
          }))}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Message"
        description={`Are you sure you want to delete "${deleteTarget?.subject}"?`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  )
}
