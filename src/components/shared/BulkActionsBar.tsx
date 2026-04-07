import { useState } from 'react'
import { Archive, FolderInput, Trash2 } from 'lucide-react'
import { Button, Modal, Select } from 'antd'
import { ConfirmModal } from '@/components/ui-kit'

interface Category {
  idCategory: string
  name: string
}

interface BulkActionsBarProps {
  count: number
  onDeselectAll: () => void
  onArchive?: () => Promise<void>
  onDelete?: () => Promise<void>
  onMoveToCategory?: {
    categories: Category[]
    onMove: (categoryId: string) => Promise<void>
  }
}

export function BulkActionsBar({
  count,
  onDeselectAll,
  onArchive,
  onDelete,
  onMoveToCategory,
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!confirmAction) return

    setIsSubmitting(true)
    try {
      if (confirmAction === 'archive' && onArchive) {
        await onArchive()
      } else if (confirmAction === 'delete' && onDelete) {
        await onDelete()
      }
      setConfirmAction(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMove = async () => {
    if (!selectedCategoryId || !onMoveToCategory) return

    setIsSubmitting(true)
    try {
      await onMoveToCategory.onMove(selectedCategoryId)
      setMoveModalOpen(false)
      setSelectedCategoryId('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (count <= 0) return null

  return (
    <>
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <div className="text-sm font-medium">{count} selected</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button htmlType="button" onClick={onDeselectAll}>
            Deselect All
          </Button>
          {onMoveToCategory && (
            <Button htmlType="button" onClick={() => setMoveModalOpen(true)}>
              <FolderInput className="mr-1.5 h-3.5 w-3.5" />
              Move to Category
            </Button>
          )}
          {onArchive && (
            <Button htmlType="button" onClick={() => setConfirmAction('archive')}>
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archive
            </Button>
          )}
          {onDelete && (
            <Button htmlType="button" danger type="primary" onClick={() => setConfirmAction('delete')}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction === 'archive' ? 'Archive selected items' : 'Delete selected items'}
        description={
          confirmAction === 'archive'
            ? 'Archive all selected items?'
            : 'Delete all selected items? This cannot be undone.'
        }
        confirmText={confirmAction === 'archive' ? 'Archive' : 'Delete'}
        danger={confirmAction === 'delete'}
        loading={isSubmitting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmAction(null)}
      />

      {onMoveToCategory && (
        <Modal
          open={moveModalOpen}
          title="Move to Category"
          onCancel={() => { setMoveModalOpen(false); setSelectedCategoryId('') }}
          onOk={() => void handleMove()}
          okText="Move"
          confirmLoading={isSubmitting}
          okButtonProps={{ disabled: !selectedCategoryId }}
          destroyOnHidden
        >
          <div className="py-4">
            <Select
              value={selectedCategoryId || undefined}
              onChange={setSelectedCategoryId}
              placeholder="Select a category"
              className="w-full"
              options={onMoveToCategory.categories.map((c) => ({
                value: c.idCategory,
                label: c.name,
              }))}
            />
          </div>
        </Modal>
      )}
    </>
  )
}
