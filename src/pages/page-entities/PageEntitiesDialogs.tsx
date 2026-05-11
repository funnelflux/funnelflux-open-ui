import { ConfirmModal, Input, Modal } from '@/components/ui-kit'
import { CsvImportDialog } from '@/components/shared/CsvImportDialog'
import { PageForm } from '@/components/forms/PageForm'
import type { CsvFieldOption, PageEntitiesPageProps } from '@/pages/page-entities/types'
import type { Page } from '@/types/entities'
import type { PageFormData } from '@/schemas/page'

interface PageEntitiesDialogsProps {
  title: string
  singularLabel: string
  pageType: PageEntitiesPageProps['pageType']
  csvFieldOptions: CsvFieldOption[]
  importOpen: boolean
  onImportOpenChange: (open: boolean) => void
  onImport: (rows: Record<string, string>[]) => Promise<void>
  sheetOpen: boolean
  onFormOpenChange: (open: boolean) => void
  editId: string | null
  editPage: Page | undefined
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
  csvFieldOptions,
  importOpen,
  onImportOpenChange,
  onImport,
  sheetOpen,
  onFormOpenChange,
  editId,
  editPage,
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
        description="Upload a CSV file, map the columns, then import the rows."
        fieldOptions={csvFieldOptions}
        onImport={onImport}
      />

      <PageForm
        open={sheetOpen}
        onOpenChange={onFormOpenChange}
        pageType={pageType}
        initialData={editId ? editPage : undefined}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
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
        description={`Delete this category? ${title} in it will become uncategorized.`}
        onConfirm={onCategoryDeleteConfirm}
        loading={categoryDeletePending}
        danger
      />
    </>
  )
}
