import { ConfirmModal } from '@/components/ui-kit'
import { OfferSourceForm } from '@/components/forms/OfferSourceForm'
import type { OfferSourceFormMode } from '@/components/forms/OfferSourceForm'
import type { OfferSource } from '@/types/entities'
import type { OfferSourceFormData } from '@/schemas/offerSource'

interface OfferSourcesDialogsProps {
  singularLabel: string
  singularLower: string
  sheetOpen: boolean
  onFormOpenChange: (open: boolean) => void
  editId: string | null
  editSource: OfferSource | undefined
  formMode: OfferSourceFormMode
  cloneInitialValues: OfferSourceFormData | null
  cloneLoading: boolean
  onSubmit: (data: OfferSourceFormData, options?: { createAnother?: boolean }) => Promise<void>
  savePending: boolean
  deleteId: string | null
  onDeleteDismiss: () => void
  onDeleteConfirm: () => void
  deletePending: boolean
  archiveConfirm: { id: string; archive: boolean } | null
  onArchiveConfirmDismiss: () => void
  onArchiveConfirm: () => void
  archivePending: boolean
}

export function OfferSourcesDialogs({
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
}: OfferSourcesDialogsProps) {
  return (
    <>
      <OfferSourceForm
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
        confirmText="Delete"
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
    </>
  )
}
