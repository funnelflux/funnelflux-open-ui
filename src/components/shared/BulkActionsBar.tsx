import { useState } from 'react'
import { Archive, CheckSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface BulkActionsBarProps {
  count: number
  categories?: Array<{ idCategory: string; name: string }>
  onArchive: () => Promise<void>
  onDelete: () => Promise<void>
  onMoveToCategory: (idCategory: string) => Promise<void>
  onSelectAll: () => void
  onDeselectAll: () => void
}

export function BulkActionsBar({
  count,
  categories = [],
  onArchive,
  onDelete,
  onMoveToCategory,
  onSelectAll,
  onDeselectAll,
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!confirmAction) {
      return
    }

    setIsSubmitting(true)
    try {
      if (confirmAction === 'archive') {
        await onArchive()
      } else {
        await onDelete()
      }
      setConfirmAction(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return count > 0 ? (
    <>
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <div className="text-sm font-medium">{count} selected</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
            <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            Select All
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDeselectAll}>
            Deselect All
          </Button>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Move to category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.idCategory} value={category.idCategory}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedCategoryId}
            onClick={() => void onMoveToCategory(selectedCategoryId)}
          >
            Move
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmAction('archive')}>
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            Archive
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmAction('delete')}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'archive' ? 'Archive selected items' : 'Delete selected items'}
        description={
          confirmAction === 'archive'
            ? 'Archive all selected items?'
            : 'Delete all selected items? This cannot be undone.'
        }
        confirmText={confirmAction === 'archive' ? 'Archive' : 'Delete'}
        destructive={confirmAction === 'delete'}
        isLoading={isSubmitting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  ) : null
}
