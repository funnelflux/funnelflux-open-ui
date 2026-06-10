import { Button, FormModal, FormModalBody, FormModalFooter, FormModalHeader } from '@/components/ui-kit'
import { FunnelSettingsPanel } from '@/components/funnel-builder/FunnelSettingsPanel'

interface FunnelSettingsModalProps {
  open: boolean
  onClose: () => void
  isNew: boolean
  titleName: string
  onSave: () => void | Promise<void>
  isSaving: boolean
}

export function FunnelSettingsModal({
  open,
  onClose,
  isNew,
  titleName,
  onSave,
  isSaving,
}: FunnelSettingsModalProps) {
  const description = titleName ? (
    <>
      Editing <span className="font-medium text-foreground">{titleName}</span>. Changes apply when you save the
      funnel.
    </>
  ) : (
    'Configure funnel name, campaign, notes, and advanced options.'
  )

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={!isSaving}
      zIndex={1100}
    >
      <FormModalHeader title="Funnel settings" description={description} />
      <FormModalBody>
        <FunnelSettingsPanel isNew={isNew} />
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="primary" htmlType="button" loading={isSaving} uiVariant="default" onClick={() => void onSave()}>
          Save Funnel
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
