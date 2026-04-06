import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Select } from 'antd'
import { useToastApi } from '@/components/ui-kit'
import { useCategories, useDeleteCategory, useSaveCategory } from '@/api/hooks'

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

  const selectedCategory = categories?.find((category) => category.idCategory === selectedCategoryId)

  const handleCreate = async () => {
    const name = window.prompt('Category name')
    if (!name?.trim()) {
      return
    }

    try {
      await saveCategory.mutateAsync({ entityType, name: name.trim() })
      toast.success('Category saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category')
    }
  }

  const handleRename = async () => {
    if (!selectedCategory) {
      return
    }

    const name = window.prompt('Rename category', selectedCategory.name)
    if (!name?.trim()) {
      return
    }

    try {
      await saveCategory.mutateAsync({
        entityType,
        idCategory: selectedCategory.idCategory,
        name: name.trim(),
      })
      toast.success('Category updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update category')
    }
  }

  const handleDelete = async () => {
    if (!selectedCategory) {
      return
    }
    if (!window.confirm(`Delete category "${selectedCategory.name}"?`)) {
      return
    }

    try {
      await deleteCategory.mutateAsync({
        entityType,
        idCategory: selectedCategory.idCategory,
      })
      onSelectCategory('')
      toast.success('Category deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={selectedCategoryId || '__all__'}
        onChange={(value) => onSelectCategory(value === '__all__' ? '' : value)}
        style={{ width: 220 }}
        options={[
          { value: '__all__', label: 'All' },
          ...(categories ?? []).map((category) => ({
            value: category.idCategory,
            label: category.name,
          })),
        ]}
      />

      <Button htmlType="button" size="small" onClick={() => void handleCreate()}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Category
      </Button>
      <Button
        htmlType="button"
        size="small"
        disabled={!selectedCategory}
        onClick={() => void handleRename()}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Rename
      </Button>
      <Button
        htmlType="button"
        size="small"
        disabled={!selectedCategory}
        onClick={() => void handleDelete()}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  )
}
