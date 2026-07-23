import { memo, useState, useCallback, useMemo, useId, useDeferredValue } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input, Select, FormModal, FormModalBody, FormModalFooter, FormModalHeader, ConfirmModal, useToastApi } from '@/components/ui-kit'
import { useCategories, useSaveCategory, useDeleteCategory } from '@/api/hooks'
import type { Category } from '@/api/hooks/useCategories'
import { getErrorMessage } from '@/lib/utils'

interface CategoryManagerProps {
  entityType: string
  selectedCategoryId: string
  onSelectCategory: (idCategory: string) => void
}

type CategoryRow = Category & { nameLower: string }

function toCategoryRows(categories: Category[]): CategoryRow[] {
  return categories.map((category) => ({
    ...category,
    nameLower: category.name.toLowerCase(),
  }))
}

function sortCategoryRows(rows: CategoryRow[]): CategoryRow[] {
  return [...rows].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
}

interface CategoryManageRowProps {
  category: CategoryRow
  isEditing: boolean
  renamePending: boolean
  onStartEditing: (idCategory: string) => void
  onCancelEditing: () => void
  onRename: (idCategory: string, name: string) => void
  onRequestDelete: (idCategory: string) => void
}

interface CategoryManageRowEditorProps {
  category: CategoryRow
  renamePending: boolean
  onCancelEditing: () => void
  onRename: (idCategory: string, name: string) => void
}

function CategoryManageRowEditor({
  category,
  renamePending,
  onCancelEditing,
  onRename,
}: CategoryManageRowEditorProps) {
  const [draftName, setDraftName] = useState(category.name)

  const handleRename = useCallback(() => {
    const trimmed = draftName.trim()
    if (!trimmed || trimmed === category.name) return
    onRename(category.idCategory, trimmed)
  }, [category.idCategory, category.name, draftName, onRename])

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
      <Input
        size="small"
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        onPressEnter={handleRename}
        className="flex-1"
      />
      <Button
        type="text"
        size="small"
        iconName="check"
        iconSize="sm"
        aria-label="Confirm rename"
        onClick={handleRename}
        disabled={!draftName.trim() || draftName.trim() === category.name}
        loading={renamePending}
      />
      <Button
        type="text"
        size="small"
        iconName="x"
        iconSize="sm"
        aria-label="Cancel rename"
        onClick={onCancelEditing}
      />
    </div>
  )
}

const CategoryManageRow = memo(function CategoryManageRow({
  category,
  isEditing,
  renamePending,
  onStartEditing,
  onCancelEditing,
  onRename,
  onRequestDelete,
}: CategoryManageRowProps) {
  const handleStartEditing = useCallback(() => {
    onStartEditing(category.idCategory)
  }, [category.idCategory, onStartEditing])

  const handleRequestDelete = useCallback(() => {
    onRequestDelete(category.idCategory)
  }, [category.idCategory, onRequestDelete])

  if (isEditing) {
    return (
      <CategoryManageRowEditor
        key={category.idCategory}
        category={category}
        renamePending={renamePending}
        onCancelEditing={onCancelEditing}
        onRename={onRename}
      />
    )
  }

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 group">
      <span className="flex-1 text-sm truncate">{category.name}</span>
      <Button
        type="text"
        size="small"
        iconName="pencil"
        iconSize="sm"
        aria-label={`Rename category ${category.name}`}
        onClick={handleStartEditing}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      />
      <Button
        type="text"
        size="small"
        danger
        iconName="trash-2"
        iconSize="sm"
        aria-label={`Delete category ${category.name}`}
        onClick={handleRequestDelete}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      />
    </div>
  )
})

interface CategoryManageModalProps {
  open: boolean
  onClose: () => void
  sortedCategories: CategoryRow[]
  entityType: string
  selectedCategoryId: string
  onSelectCategory: (idCategory: string) => void
  onAddNew: () => void
}

function CategoryManageModal({
  open,
  onClose,
  sortedCategories,
  entityType,
  selectedCategoryId,
  onSelectCategory,
  onAddNew,
}: CategoryManageModalProps) {
  const toast = useToastApi()
  const saveCategory = useSaveCategory()
  const deleteCategory = useDeleteCategory()

  const [manageSearch, setManageSearch] = useState('')
  const deferredSearch = useDeferredValue(manageSearch)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const manageSearchLower = deferredSearch.trim().toLowerCase()

  const filteredCategories = useMemo(() => {
    if (!manageSearchLower) return sortedCategories
    return sortedCategories.filter((category) => category.nameLower.includes(manageSearchLower))
  }, [manageSearchLower, sortedCategories])

  const resetModalState = useCallback(() => {
    setManageSearch('')
    setEditingId(null)
    setDeleteId(null)
  }, [])

  const handleClose = useCallback(() => {
    resetModalState()
    onClose()
  }, [onClose, resetModalState])

  const handleRename = useCallback(async (idCategory: string, name: string) => {
    try {
      await saveCategory.mutateAsync({ entityType, idCategory, name })
      toast.success('Category renamed')
      setEditingId(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [entityType, saveCategory, toast])

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteId) return
    try {
      await deleteCategory.mutateAsync({ entityType, idCategory: deleteId })
      toast.success('Category deleted')
      if (selectedCategoryId === deleteId) {
        onSelectCategory('')
      }
      setDeleteId(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [deleteCategory, deleteId, entityType, onSelectCategory, selectedCategoryId, toast])

  const handleStartEditing = useCallback((idCategory: string) => {
    setEditingId(idCategory)
  }, [])

  const handleCancelEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleRequestDelete = useCallback((idCategory: string) => {
    setDeleteId(idCategory)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setManageSearch(value)
  }, [])

  const handleClearSearch = useCallback(() => {
    setManageSearch('')
  }, [])

  const handleAddNew = useCallback(() => {
    resetModalState()
    onAddNew()
  }, [onAddNew, resetModalState])

  if (!open) return null

  return (
    <>
      <FormModal open onCancel={handleClose} width={480}>
        <FormModalHeader title="Manage Categories" />
        <FormModalBody>
          {sortedCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No categories yet.</p>
          ) : (
            <>
              <Input
                prefix={
                  <span className="text-[var(--muted-fg)]">
                    <Icon name="search" size="sm" aria-hidden />
                  </span>
                }
                placeholder="Search categories..."
                value={manageSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
                onClear={handleClearSearch}
                size="small"
                className="mb-3"
              />
              {filteredCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No categories match your search.
                </p>
              ) : (
                <div className="space-y-1 max-h-[min(50vh,360px)] overflow-y-auto">
                  {filteredCategories.map((category) => (
                    <CategoryManageRow
                      key={category.idCategory}
                      category={category}
                      isEditing={editingId === category.idCategory}
                      renamePending={
                        saveCategory.isPending && editingId === category.idCategory
                      }
                      onStartEditing={handleStartEditing}
                      onCancelEditing={handleCancelEditing}
                      onRename={handleRename}
                      onRequestDelete={handleRequestDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-4 pt-3 border-t border-border">
            <Button
              type="dashed"
              block
              iconName="plus"
              iconSize="sm"
              onClick={handleAddNew}
            >
              Add New Category
            </Button>
          </div>
        </FormModalBody>
        <FormModalFooter>
          <Button onClick={handleClose}>Close</Button>
        </FormModalFooter>
      </FormModal>

      <ConfirmModal
        open={deleteId != null}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        title="Delete category?"
        description="Items in this category will become uncategorized."
        confirmText="Delete"
        danger
        loading={deleteCategory.isPending}
      />
    </>
  )
}

export function CategoryManager({
  entityType,
  selectedCategoryId,
  onSelectCategory,
}: CategoryManagerProps) {
  const toast = useToastApi()
  const { data: categories } = useCategories(entityType)
  const saveCategory = useSaveCategory()

  const [createOpen, setCreateOpen] = useState(false)
  const [createValue, setCreateValue] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const createFormId = useId()

  const sortedCategories = useMemo(
    () => sortCategoryRows(toCategoryRows(categories ?? [])),
    [categories],
  )

  const filterSelectOptions = useMemo(
    () => [
      { value: '__all__', label: 'All Categories' },
      ...sortedCategories.map((category) => ({
        value: category.idCategory,
        label: category.name,
      })),
    ],
    [sortedCategories],
  )

  const handleCreate = useCallback(async () => {
    if (!createValue.trim()) return
    try {
      await saveCategory.mutateAsync({ entityType, name: createValue.trim() })
      toast.success('Category created')
      setCreateOpen(false)
      setCreateValue('')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [createValue, entityType, saveCategory, toast])

  const handleSelectChange = useCallback(
    (value: string) => onSelectCategory(value === '__all__' ? '' : value),
    [onSelectCategory],
  )

  const handleOpenCreate = useCallback(() => setCreateOpen(true), [])
  const handleOpenManage = useCallback(() => setManageOpen(true), [])
  const handleCloseManage = useCallback(() => setManageOpen(false), [])
  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false)
    setCreateValue('')
  }, [])
  const handleSwitchToCreate = useCallback(() => {
    setManageOpen(false)
    setCreateOpen(true)
  }, [])

  const hasCategories = sortedCategories.length > 0

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Select
          value={selectedCategoryId || '__all__'}
          onChange={handleSelectChange}
          className="w-[220px]"
          alphabetical={false}
          options={filterSelectOptions}
        />
        <Button
          type="text"
          size="small"
          iconName="plus"
          iconSize="sm"
          onClick={handleOpenCreate}
          title="Add category"
        />
        {hasCategories ? (
          <Button
            type="text"
            size="small"
            iconName="settings-2"
            iconSize="sm"
            onClick={handleOpenManage}
            title="Manage categories"
          />
        ) : null}
      </div>

      {createOpen ? (
        <FormModal open onCancel={handleCloseCreate} width={480}>
          <FormModalHeader title="Create Category" />
          <FormModalBody>
            <form
              id={createFormId}
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreate()
              }}
            >
              <Input
                placeholder="Category name"
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
              />
            </form>
          </FormModalBody>
          <FormModalFooter>
            <Button htmlType="button" onClick={handleCloseCreate}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              form={createFormId}
              loading={saveCategory.isPending}
              disabled={!createValue.trim()}
            >
              Create
            </Button>
          </FormModalFooter>
        </FormModal>
      ) : null}

      <CategoryManageModal
        open={manageOpen}
        onClose={handleCloseManage}
        sortedCategories={sortedCategories}
        entityType={entityType}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
        onAddNew={handleSwitchToCreate}
      />
    </>
  )
}
