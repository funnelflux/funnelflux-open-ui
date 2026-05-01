import { Input, Modal } from '@/components/ui-kit'

interface PageCategoryCreateModalProps {
  open: boolean
  inputId: string
  value: string
  confirmLoading: boolean
  onChange: (value: string) => void
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

export function PageCategoryCreateModal({
  open,
  inputId,
  value,
  confirmLoading,
  onChange,
  onConfirm,
  onCancel,
}: PageCategoryCreateModalProps) {
  return (
    <Modal
      title="New category"
      open={open}
      okText="Create"
      cancelText="Cancel"
      confirmLoading={confirmLoading}
      onOk={() => void onConfirm()}
      onCancel={onCancel}
      destroyOnHidden
    >
      <p className="mb-2 text-sm text-muted-foreground">Letters, numbers, and spaces only.</p>
      <label htmlFor={inputId} className="sr-only">
        Category name
      </label>
      <Input
        id={inputId}
        size="md"
        className="h-control-md"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Category name"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void onConfirm()
          }
        }}
      />
    </Modal>
  )
}
