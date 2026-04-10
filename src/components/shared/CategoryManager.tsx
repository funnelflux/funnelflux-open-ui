import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Input, Modal, Select } from 'antd'
import { useToastApi } from '@/components/ui-kit'
import { useCategories, useSaveCategory } from '@/api/hooks'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [modalValue, setModalValue] = useState('')

  const handleCreate = async () => {
    if (!modalValue.trim()) return

    try {
      await saveCategory.mutateAsync({ entityType, name: modalValue.trim() })
      toast.success('Category created')
      setModalOpen(false)
      setModalValue('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create category')
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
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
        <Button
          type="text"
          size="small"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setModalOpen(true)}
        />
      </div>

      <Modal
        open={modalOpen}
        title="Create Category"
        onCancel={() => { setModalOpen(false); setModalValue('') }}
        onOk={() => void handleCreate()}
        okText="Save"
        confirmLoading={saveCategory.isPending}
        okButtonProps={{ disabled: !modalValue.trim() }}
        destroyOnHidden
      >
        <div className="py-4">
          <Input
            placeholder="Category name"
            value={modalValue}
            onChange={(e) => setModalValue(e.target.value)}
            onPressEnter={() => void handleCreate()}
            autoFocus
          />
        </div>
      </Modal>
    </>
  )
}
