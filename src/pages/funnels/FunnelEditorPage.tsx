import { useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { useFunnel, useSaveFunnel } from '@/api/hooks'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { FunnelTopForm } from '@/components/funnel-builder/FunnelTopForm'
import { FunnelCanvas } from '@/components/funnel-builder/FunnelCanvas'
import { FunnelAdvancedSettings } from '@/components/funnel-builder/FunnelAdvancedSettings'
import { useToastApi } from '@/components/ui-kit'
import { Button } from 'antd'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import type { ApiFunnel } from '@/types/funnel'

export function FunnelEditorPage() {
  const { campaignId, funnelId } = useParams<{ campaignId: string; funnelId: string }>()
  const navigate = useNavigate()
  const toast = useToastApi()

  const isNew = funnelId === 'new'
  const { data: funnel, isLoading } = useFunnel(isNew ? '' : funnelId ?? '')
  const saveFunnel = useSaveFunnel()

  const hydrate = useFunnelEditorStore((s) => s.hydrate)
  const reset = useFunnelEditorStore((s) => s.reset)
  const serialize = useFunnelEditorStore((s) => s.serialize)
  const isDirty = useFunnelEditorStore((s) => s.isDirty)
  const markClean = useFunnelEditorStore((s) => s.markClean)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)

  // Hydrate store from API data
  useEffect(() => {
    if (isNew) {
      reset()
      if (campaignId) {
        updateMeta({ idCampaign: campaignId })
      }
    } else if (funnel) {
      hydrate(funnel as ApiFunnel)
    }
  }, [funnel, isNew, campaignId, hydrate, reset, updateMeta])

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSave = useCallback(async () => {
    const data = serialize()
    try {
      await saveFunnel.mutateAsync(data)
      markClean()
      toast.success('Funnel saved successfully')
      if (isNew) {
        navigate(`/campaigns/${campaignId}/funnels/${data.idFunnel}`, { replace: true })
      }
    } catch {
      toast.error('Failed to save funnel')
    }
  }, [serialize, saveFunnel, markClean, toast, isNew, navigate, campaignId])

  const handleBack = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('You have unsaved changes. Discard them?')
      if (!ok) return
    }
    navigate(campaignId ? `/campaigns` : '/')
  }, [isDirty, navigate, campaignId])

  if (isLoading && !isNew) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button type="text" size="small" onClick={handleBack} icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <span className="text-sm text-muted-foreground">
              {isNew ? 'New Funnel' : 'Edit Funnel'}
            </span>
            {isDirty && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Unsaved
              </span>
            )}
          </div>
          <Button
            type="primary"
            size="small"
            onClick={handleSave}
            disabled={saveFunnel.isPending}
            icon={saveFunnel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          >
            Save
          </Button>
        </div>

        {/* Top form */}
        <FunnelTopForm isNew={isNew} />

        {/* Canvas */}
        <FunnelCanvas />

        {/* Advanced settings */}
        <FunnelAdvancedSettings />
      </div>
    </ReactFlowProvider>
  )
}
