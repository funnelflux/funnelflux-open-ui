import { useState, useCallback } from 'react'
import { Plus, Settings2, Pencil, Trash2, Check, X } from 'lucide-react'
import { Popconfirm } from '@/components/ui-kit'
import { Button, Input, Select, Modal, useToastApi } from '@/components/ui-kit'
import { useCategories, useSaveCategory, useDeleteCategory } from '@/api/hooks'
import { getErrorMessage } from '@/lib/utils'

interface CategoryManagerProps {
  entityType: string
  selectedCategoryId: string
  onSelectCategory: (idCategory: string) => void
}

export function CategoryManager({
  entityType,
  selectedCategoryId,
  onSelectCategory,
}: CategoryManagerProps) {
  const toast = useToastApi()
  const { data: categories } = useCategories(entityType)
  const saveCategory = useSaveCategory()
  const deleteCategory = useDeleteCategory()

  const [createOpen, setCreateOpen] = useState(false)
  const [createValue, setCreateValue] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

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

  const handleRename = useCallback(async (idCategory: string) => {
    if (!editingName.trim()) return
    try {
      await saveCategory.mutateAsync({ entityType, idCategory, name: editingName.trim() })
      toast.success('Category renamed')
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [editingName, entityType, saveCategory, toast])

  const handleDelete = useCallback(async (idCategory: string) => {
    try {
      await deleteCategory.mutateAsync({ entityType, idCategory })
      toast.success('Category deleted')
      if (selectedCategoryId === idCategory) {
        onSelectCategory('')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [deleteCategory, entityType, onSelectCategory, selectedCategoryId, toast])

  const startEditing = (idCategory: string, name: string) => {
    setEditingId(idCategory)
    setEditingName(name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Select
          value={selectedCategoryId || '__all__'}
          onChange={(value) => onSelectCategory(value === '__all__' ? '' : value)}
          style={{ width: 220 }}
          options={[
            { value: '__all__', label: 'All Categories' },
            ...(categories ?? []).map((category) => ({
              value: category.idCategory,
              label: category.name,
            })),
          ]}
        />
        <Button
          type="text"
          size="small"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setCreateOpen(true)}
          title="Add category"
        />
        {(categories ?? []).length > 0 && (
          <Button
            type="text"
            size="small"
            icon={<Settings2 className="h-3.5 w-3.5" />}
            onClick={() => setManageOpen(true)}
            title="Manage categories"
          />
        )}
      </div>

      {/* Create category modal */}
      <Modal
        open={createOpen}
        title="Create Category"
        onCancel={() => { setCreateOpen(false); setCreateValue('') }}
        onOk={() => void handleCreate()}
        okText="Create"
        confirmLoading={saveCategory.isPending}
        okButtonProps={{ disabled: !createValue.trim() }}
        destroyOnHidden
      >
        <div className="py-4">
          <Input
            placeholder="Category name"
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            onPressEnter={() => void handleCreate()}
            autoFocus
          />
        </div>
      </Modal>

      {/* Manage categories modal */}
      <Modal
        open={manageOpen}
        title="Manage Categories"
        onCancel={() => { setManageOpen(false); cancelEditing() }}
        footer={
          <Button onClick={() => { setManageOpen(false); cancelEditing() }}>
            Close
          </Button>
        }
        width={480}
        destroyOnHidden
      >
        <div className="py-2">
          {(categories ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No categories yet.</p>
          ) : (
            <div className="space-y-1">
              {(categories ?? []).map((cat) => (
                <div
                  key={cat.idCategory}
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 group"
                >
                  {editingId === cat.idCategory ? (
                    <>
                      <Input
                        size="small"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onPressEnter={() => void handleRename(cat.idCategory)}
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<Check className="h-3.5 w-3.5 text-green-600" />}
                        onClick={() => void handleRename(cat.idCategory)}
                        disabled={!editingName.trim() || editingName.trim() === cat.name}
                        loading={saveCategory.isPending}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<X className="h-3.5 w-3.5" />}
                        onClick={cancelEditing}
                      />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm truncate">{cat.name}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<Pencil className="h-3 w-3" />}
                        onClick={() => startEditing(cat.idCategory, cat.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      <Popconfirm
                        title="Delete category?"
                        description="Items in this category will become uncategorized."
                        onConfirm={() => void handleDelete(cat.idCategory)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<Trash2 className="h-3 w-3" />}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </Popconfirm>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border">
            <Button
              type="dashed"
              block
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => { setManageOpen(false); setCreateOpen(true) }}
            >
              Add New Category
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
