import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/shared/Toaster'
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
  const toast = useToast()
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
        onValueChange={(value) => onSelectCategory(value === '__all__' ? '' : value)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {(categories ?? []).map((category) => (
            <SelectItem key={category.idCategory} value={category.idCategory}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" variant="outline" size="sm" onClick={() => void handleCreate()}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Category
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selectedCategory}
        onClick={() => void handleRename()}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Rename
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selectedCategory}
        onClick={() => void handleDelete()}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  )
}
