import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        width="min(1200px, 96vw)"
        zIndex={1100}
        styles={{
          body: {
            padding: 0,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        className="[&_.ant-modal-content]:flex [&_.ant-modal-content]:max-h-[90vh] [&_.ant-modal-content]:flex-col [&_.ant-modal-content]:overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4">
            <DialogTitle className="text-lg">Funnel settings</DialogTitle>
            <DialogDescription>
              {titleName ? (
                <>
                  Editing <span className="font-medium text-foreground">{titleName}</span>. Changes apply when you save
                  the funnel.
                </>
              ) : (
                'Configure funnel name, campaign, notes, and advanced options.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <FunnelSettingsPanel isNew={isNew} />
          </div>

          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:justify-between">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-[120px] bg-orange-600 text-white hover:bg-orange-600/90"
              onClick={() => void onSave()}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Funnel
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
