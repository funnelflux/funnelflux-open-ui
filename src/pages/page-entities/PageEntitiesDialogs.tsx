import { ConfirmModal, Input, FormModal, FormModalBody, FormModalFooter, FormModalHeader, Button } from '@/components/ui-kit'
import { CsvImportDialog } from '@/components/shared/CsvImportDialog'
import { PageForm } from '@/components/forms/PageForm'
import type { PageFormMode } from '@/components/forms/PageForm'
import type { PageEntitiesPageProps } from '@/pages/page-entities/types'
import type { Page } from '@/types/entities'
import type { PageFormData } from '@/schemas/page'

interface PageEntitiesDialogsProps {
  title: string
  singularLabel: string
  pageType: PageEntitiesPageProps['pageType']
  templateUrl: string
  importOpen: boolean
  onImportOpenChange: (open: boolean) => void
  onImport: (file: File) => Promise<void>
  sheetOpen: boolean
  onFormOpenChange: (open: boolean) => void
  editId: string | null
  editPage: Page | undefined
  formMode: PageFormMode
  cloneInitialValues: PageFormData | null
  cloneLoading: boolean
  onSubmit: (data: PageFormData) => void
  isSubmitting: boolean
  deleteId: string | null
  onDeleteDismiss: () => void
  onDeleteConfirm: () => void
  deletePending: boolean
  archiveConfirm: { id: string; archive: boolean } | null
  onArchiveConfirmDismiss: () => void
  onArchiveConfirm: () => void
  archivePending: boolean
  singularLower: string
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

export function PageEntitiesDialogs({
  title,
  singularLabel,
  pageType,
  templateUrl,
  importOpen,
  onImportOpenChange,
  onImport,
  sheetOpen,
  onFormOpenChange,
  editId,
  editPage,
  formMode,
  cloneInitialValues,
  cloneLoading,
  onSubmit,
  isSubmitting,
  deleteId,
  onDeleteDismiss,
  onDeleteConfirm,
  deletePending,
  archiveConfirm,
  onArchiveConfirmDismiss,
  onArchiveConfirm,
  archivePending,
  singularLower,
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
}: PageEntitiesDialogsProps) {
  return (
    <>
      <CsvImportDialog
        open={importOpen}
        onOpenChange={onImportOpenChange}
        title={`Import ${title}`}
        templateUrl={templateUrl}
        onImport={onImport}
      />

      <PageForm
        open={sheetOpen}
        onOpenChange={onFormOpenChange}
        pageType={pageType}
        mode={formMode}
        initialData={editId ? editPage : undefined}
        createInitialValues={cloneInitialValues ?? undefined}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting || cloneLoading}
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

      <FormModal
        open={Boolean(categoryRename)}
        onCancel={onCategoryRenameDismiss}
        width={480}
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
        description={`Delete this category? ${title} in it will become uncategorized.`}
        confirmText="Delete"
        onConfirm={onCategoryDeleteConfirm}
        loading={categoryDeletePending}
        danger
      />
    </>
  )
}
