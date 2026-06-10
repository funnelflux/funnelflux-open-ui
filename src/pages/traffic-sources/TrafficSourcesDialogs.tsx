import { ConfirmModal, Input, FormModal, FormModalBody, FormModalFooter, FormModalHeader, Button } from '@/components/ui-kit'
import { TrafficSourceForm } from '@/components/forms/TrafficSourceForm'
import type { TrafficSource } from '@/types/entities'
import type { TrafficSourceFormMode } from '@/components/forms/TrafficSourceForm'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'

interface TrafficSourcesDialogsProps {
  singularLabel: string
  singularLower: string
  sheetOpen: boolean
  onFormOpenChange: (open: boolean) => void
  editId: string | null
  editSource: TrafficSource | undefined
  formMode: TrafficSourceFormMode
  cloneInitialValues: TrafficSourceFormData | null
  cloneLoading: boolean
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
  formMode,
  cloneInitialValues,
  cloneLoading,
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
        mode={formMode}
        initialData={editId ? editSource : undefined}
        createInitialValues={cloneInitialValues ?? undefined}
        onSubmit={onSubmit}
        isSubmitting={savePending || cloneLoading}
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

      <FormModal
        open={Boolean(categoryRename)}
        onCancel={onCategoryRenameDismiss}
        destroyOnHidden
      >
        <FormModalHeader title="Rename category" />
        <FormModalBody>
          <Input
            value={categoryRenameDraft}
            onChange={(event) => onCategoryRenameDraftChange(event.target.value)}
            placeholder="Category name"
            onPressEnter={onCategoryRenameConfirm}
          />
        </FormModalBody>
        <FormModalFooter>
          <Button htmlType="button" onClick={onCategoryRenameDismiss}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="button"
            onClick={onCategoryRenameConfirm}
            loading={categoryRenamePending}
            disabled={!categoryRenameDraft.trim()}
          >
            Save
          </Button>
        </FormModalFooter>
      </FormModal>

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
