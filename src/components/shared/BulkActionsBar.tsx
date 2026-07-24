import { useState, useCallback, useMemo, useRef } from 'react'
import { Button, ConfirmModal, Modal, Select } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

interface Category {
  idCategory: string
  name: string
}

interface BulkActionsBarProps {
  count: number
  onDeselectAll: () => void
  onArchive?: () => Promise<void>
  onDelete?: () => Promise<void>
  /** Campaigns-style bulk move (e.g. funnels) */
  onMove?: () => void
  onMoveToCategory?: {
    categories: Category[]
    onMove: (categoryId: string) => Promise<void>
  }
  /** Primary move action label (e.g. "Move funnels" on campaigns). */
  moveLabel?: string
  /** Bulk archive button label (e.g. "Archive funnels"). */
  archiveLabel?: string
  /** Override delete confirmation copy (e.g. category + child rows). */
  deleteConfirmTitle?: string
  deleteConfirmDescription?: string
  /** Page-specific bulk actions without confirmation (e.g. inbox mark read/unread). */
  extraActions?: { key: string; label: string; onAction: () => Promise<void> }[]
  /** Top overlay above the navbar (`z-50`) or legacy sticky bottom inside the page. */
  variant?: 'floatingTop' | 'bottom'
}

export function BulkActionsBar({
  count,
  onDeselectAll,
  onArchive,
  onDelete,
  onMove,
  onMoveToCategory,
  moveLabel = 'Move',
  archiveLabel = 'Archive',
  deleteConfirmTitle,
  deleteConfirmDescription,
  extraActions,
  variant = 'floatingTop',
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runningExtraKey, setRunningExtraKey] = useState<string | null>(null)
  const busyRef = useRef(false)
  const isBusy = isSubmitting || runningExtraKey !== null

  const runExtraAction = useCallback(async (key: string, onAction: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setRunningExtraKey(key)
    try {
      await onAction()
    } finally {
      busyRef.current = false
      setRunningExtraKey(null)
    }
  }, [])

  const runArchiveOrDelete = useCallback(async () => {
    if (!confirmAction || busyRef.current) return

    busyRef.current = true
    setIsSubmitting(true)
    try {
      if (confirmAction === 'archive' && onArchive) {
        await onArchive()
      } else if (confirmAction === 'delete' && onDelete) {
        await onDelete()
      }
      setConfirmAction(null)
    } finally {
      busyRef.current = false
      setIsSubmitting(false)
    }
  }, [confirmAction, onArchive, onDelete])

  const handleConfirmModalConfirm = useCallback(() => {
    void runArchiveOrDelete()
  }, [runArchiveOrDelete])

  const handleDismissConfirm = useCallback(() => {
    if (busyRef.current) return
    setConfirmAction(null)
  }, [])

  const handleRequestArchive = useCallback(() => {
    if (busyRef.current) return
    setConfirmAction('archive')
  }, [])

  const handleRequestDelete = useCallback(() => {
    if (busyRef.current) return
    setConfirmAction('delete')
  }, [])

  const handleOpenMoveCategoryModal = useCallback(() => {
    if (busyRef.current) return
    setMoveModalOpen(true)
  }, [])

  const runCategoryMove = useCallback(async () => {
    if (!selectedCategoryId || !onMoveToCategory || busyRef.current) return

    busyRef.current = true
    setIsSubmitting(true)
    try {
      await onMoveToCategory.onMove(selectedCategoryId)
      setMoveModalOpen(false)
      setSelectedCategoryId('')
    } finally {
      busyRef.current = false
      setIsSubmitting(false)
    }
  }, [selectedCategoryId, onMoveToCategory])

  const handleMoveModalOk = useCallback(() => {
    void runCategoryMove()
  }, [runCategoryMove])

  const handleMoveModalCancel = useCallback(() => {
    if (busyRef.current) return
    setMoveModalOpen(false)
    setSelectedCategoryId('')
  }, [])

  const moveCategoryOptions = useMemo(
    () =>
      (onMoveToCategory?.categories ?? []).map((c) => ({
        value: c.idCategory,
        label: c.name,
      })),
    [onMoveToCategory?.categories],
  )

  if (count <= 0) return null

  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg',
          variant === 'floatingTop'
            ? 'fixed top-2 left-1/2 z-[100] w-[min(720px,calc(100vw-24px))] -translate-x-1/2'
            : 'sticky bottom-4 z-30 shadow-md',
        )}
      >
        <div className="text-sm font-medium">{count} selected</div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button htmlType="button" type="default" size="small" disabled={isBusy} onClick={onDeselectAll}>
            Clear
          </Button>
          {(extraActions ?? []).map((action) => (
            <Button
              key={action.key}
              htmlType="button"
              type="default"
              size="small"
              loading={runningExtraKey === action.key}
              disabled={isBusy && runningExtraKey !== action.key}
              onClick={() => void runExtraAction(action.key, action.onAction)}
            >
              {action.label}
            </Button>
          ))}
          {onMove ? (
            <Button htmlType="button" type="default" size="small" disabled={isBusy} onClick={onMove} iconName="workflow" iconSize="sm">
              {moveLabel}
            </Button>
          ) : null}
          {onMoveToCategory ? (
            <Button htmlType="button" type="default" size="small" disabled={isBusy} onClick={handleOpenMoveCategoryModal} iconName="folder-input" iconSize="sm">
              Move to category
            </Button>
          ) : null}
          {onArchive ? (
            <Button htmlType="button" type="default" size="small" disabled={isBusy} onClick={handleRequestArchive} iconName="archive" iconSize="sm">
              {archiveLabel}
            </Button>
          ) : null}
          {onDelete ? (
            <Button htmlType="button" danger type="primary" size="small" disabled={isBusy} onClick={handleRequestDelete} iconName="trash-2" iconSize="sm">
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction === 'archive'
            ? 'Archive selected items'
            : (deleteConfirmTitle ?? 'Delete selected items')
        }
        description={
          confirmAction === 'archive'
            ? 'Archive all selected items?'
            : (deleteConfirmDescription ?? 'Delete all selected items? This cannot be undone.')
        }
        confirmText={confirmAction === 'archive' ? 'Archive' : 'Delete'}
        danger={confirmAction === 'delete'}
        loading={isSubmitting}
        onConfirm={handleConfirmModalConfirm}
        onCancel={handleDismissConfirm}
      />

      {onMoveToCategory ? (
        <Modal
          open={moveModalOpen}
          title="Move to category"
          onCancel={handleMoveModalCancel}
          onOk={handleMoveModalOk}
          okText="Move"
          confirmLoading={isSubmitting}
          okButtonProps={{ disabled: !selectedCategoryId || isSubmitting }}
          destroyOnHidden
        >
          <div className="py-4">
            <Select
              value={selectedCategoryId || undefined}
              onChange={setSelectedCategoryId}
              placeholder="Select a category"
              className="w-full"
              options={moveCategoryOptions}
            />
          </div>
        </Modal>
      ) : null}
    </>
  )
}
