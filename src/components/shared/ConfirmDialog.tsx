import { Modal } from 'antd'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  isLoading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onCancel,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = true,
  isLoading,
  onConfirm,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50",
              destructive
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-primary/90",
            )}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      }
      closable={false}
      maskClosable={false}
      destroyOnClose
      width={400}
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  )
}
