import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            type="primary"
            danger={danger}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      }
      closable={!loading}
      mask={{ closable: !loading }}
      destroyOnHidden
      width={400}
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  )
}
