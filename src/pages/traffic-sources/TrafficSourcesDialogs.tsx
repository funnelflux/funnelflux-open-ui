import { ConfirmModal, Input, Modal } from '@/components/ui-kit'
import { TrafficSourceForm } from '@/components/forms/TrafficSourceForm'
import type { TrafficSource } from '@/types/entities'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'

interface TrafficSourcesDialogsProps {
  singularLabel: string
  singularLower: string
  sheetOpen: boolean
  onFormOpenChange: (open: boolean) => void
  editId: string | null
  editSource: TrafficSource | undefined
  onSubmit: (data: TrafficSourceFormData) => void
  savePending: boolean
  deleteId: string | null
  onDeleteDismiss: () => void
  onDeleteConfirm: () => void
  deletePending: boolean
  archiveConfirm: { id: string; archive: boolean } | null
  onArchiveConfirmDismiss: () => void
  onArchiveConfirm: () => void
  archivePending: boolean
  categoryRename: { idCategory: string; name: string } | null
  categoryRenameDraft: string
  onCategoryRenameDraftChange: (value: string) => void
  onCategoryRenameDismiss: () => void
  onCategoryRenameConfirm: () => void
  categoryRenamePending: boolean
  categoryDeleteId: string | null
  onCategoryDeleteDismiss: () => void
  onCategoryDeleteConfirm: () => void
  categoryDeletePending: boolean
}

export function TrafficSourcesDialogs({
  singularLabel,
  singularLower,
  sheetOpen,
  onFormOpenChange,
  editId,
  editSource,
  onSubmit,
  savePending,
  deleteId,
  onDeleteDismiss,
  onDeleteConfirm,
  deletePending,
  archiveConfirm,
  onArchiveConfirmDismiss,
  onArchiveConfirm,
  archivePending,
  categoryRename,
  categoryRenameDraft,
  onCategoryRenameDraftChange,
  onCategoryRenameDismiss,
  onCategoryRenameConfirm,
  categoryRenamePending,
  categoryDeleteId,
  onCategoryDeleteDismiss,
  onCategoryDeleteConfirm,
  categoryDeletePending,
}: TrafficSourcesDialogsProps) {
  return (
    <>
      <TrafficSourceForm
        open={sheetOpen}
        onOpenChange={onFormOpenChange}
        initialData={editId ? editSource : undefined}
        onSubmit={onSubmit}
        isSubmitting={savePending}
      />

      <ConfirmModal
        open={Boolean(deleteId)}
        onCancel={onDeleteDismiss}
        title={`Delete ${singularLabel}`}
        description="Are you sure? This cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={deletePending}
        danger
      />

      <ConfirmModal
        open={Boolean(archiveConfirm)}
        onCancel={onArchiveConfirmDismiss}
        title={archiveConfirm?.archive ? `Archive ${singularLabel}` : `Restore ${singularLabel}`}
        description={
          archiveConfirm?.archive
            ? `Archive this ${singularLower}? Archived items are hidden from the default Active view.`
            : `Restore this ${singularLower} to the active list?`
        }
        onConfirm={onArchiveConfirm}
        loading={archivePending}
        danger={Boolean(archiveConfirm?.archive)}
      />

      <Modal
        open={Boolean(categoryRename)}
        title="Rename category"
        onCancel={onCategoryRenameDismiss}
        onOk={onCategoryRenameConfirm}
        okText="Save"
        confirmLoading={categoryRenamePending}
        okButtonProps={{ disabled: !categoryRenameDraft.trim() }}
        destroyOnHidden
      >
        <div className="py-4">
          <Input
            value={categoryRenameDraft}
            onChange={(event) => onCategoryRenameDraftChange(event.target.value)}
            placeholder="Category name"
            onPressEnter={onCategoryRenameConfirm}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(categoryDeleteId)}
        onCancel={onCategoryDeleteDismiss}
        title="Delete category"
        description={`Delete this category? ${singularLabel}s in it will become uncategorized.`}
        onConfirm={onCategoryDeleteConfirm}
        loading={categoryDeletePending}
        danger
      />
    </>
  )
}
