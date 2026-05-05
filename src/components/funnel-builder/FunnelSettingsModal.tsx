import { Button, Modal } from '@/components/ui-kit'
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
  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={!isSaving}
      width="min(1200px, 96vw)"
      zIndex={1100}
      layoutVariant="form"
      title={
        <div className="space-y-1 pr-8">
          <div className="text-lg font-semibold text-foreground">Funnel settings</div>
          <p className="text-sm font-normal text-muted-foreground">
            {titleName ? (
              <>
                Editing <span className="font-medium text-foreground">{titleName}</span>. Changes apply when you save the
                funnel.
              </>
            ) : (
              'Configure funnel name, campaign, notes, and advanced options.'
            )}
          </p>
        </div>
      }
      styles={{
        body: { maxHeight: 'calc(90vh - 200px)', overflowY: 'auto', padding: '16px 24px' },
        header: { marginBottom: 0 },
        footer: { marginTop: 0 },
      }}
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button htmlType="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="primary" htmlType="button" loading={isSaving} uiVariant="default" onClick={() => void onSave()}>
            Save Funnel
          </Button>
        </div>
      }
    >
      <FunnelSettingsPanel isNew={isNew} />
    </Modal>
  )
}
