import { useEffect, useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { useQueryClient } from '@tanstack/react-query'
import { useFunnel } from '@/api/hooks'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { FunnelSettingsModal } from '@/components/funnel-builder/FunnelSettingsModal'
import { FunnelQuickStatsModal } from '@/components/funnel-builder/FunnelQuickStatsModal'
import { FunnelCanvas } from '@/components/funnel-builder/FunnelCanvas'
import { useToastApi } from '@/components/ui-kit'
import { Button } from '@/components/ui-kit'
import { useAuthStore } from '@/store/auth'
import { ArrowLeft, BarChart3, Loader2, Save, Settings } from 'lucide-react'
import { buildV2SavePayload, extractPersistExtras, type FunnelPersistExtras } from '@/lib/funnelApiV2'
import { generateId } from '@/lib/id-generator'

export function FunnelEditorPage() {
  const { campaignId, funnelId } = useParams<{ campaignId: string; funnelId: string }>()
  const navigate = useNavigate()
  const toast = useToastApi()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickStatsOpen, setQuickStatsOpen] = useState(false)
  const canViewStats = useAuthStore((s) => s.user?.permissions.stats.canView)

  const isNew = funnelId === 'new'
  const { data: funnel, isLoading } = useFunnel(isNew ? '' : funnelId ?? '', {
    loadDependencies: true,
  })

  const hydrate = useFunnelEditorStore((s) => s.hydrate)
  const reset = useFunnelEditorStore((s) => s.reset)
  const meta = useFunnelEditorStore((s) => s.meta)
  const nodes = useFunnelEditorStore((s) => s.nodes)
  const edges = useFunnelEditorStore((s) => s.edges)
  const isDirty = useFunnelEditorStore((s) => s.isDirty)
  const markClean = useFunnelEditorStore((s) => s.markClean)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)

  const persistExtrasRef = useRef<FunnelPersistExtras>({})

  useEffect(() => {
    if (isNew) {
      reset()
      if (campaignId) {
        updateMeta({ idCampaign: campaignId, idFunnel: generateId() })
      }
    } else if (funnel) {
      persistExtrasRef.current = extractPersistExtras(funnel)
      hydrate(funnel)
    }
  }, [funnel, isNew, campaignId, hydrate, reset, updateMeta])

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
    const body = buildV2SavePayload(meta, nodes, edges, persistExtrasRef.current)
    setIsSaving(true)
    try {
      if (isNew) {
        await api.post('/data/campaign/funnel/save/', body)
        markClean()
        await queryClient.invalidateQueries({ queryKey: queryKeys.funnels.all })
        toast.success('Funnel saved successfully')
        setSettingsOpen(false)
        navigate(`/campaigns/${campaignId}/funnels/${String(body.idFunnel)}`, { replace: true })
      } else {
        await api.put('/data/campaign/funnel/save/', body, { deleteDependencies: 'true' })
        markClean()
        await queryClient.invalidateQueries({ queryKey: queryKeys.funnels.all })
        if (funnelId) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.funnels.detail(funnelId) })
        }
        toast.success('Funnel saved successfully')
        setSettingsOpen(false)
      }
    } catch {
      toast.error('Failed to save funnel')
    } finally {
      setIsSaving(false)
    }
  }, [meta, nodes, edges, markClean, toast, isNew, navigate, campaignId, queryClient, funnelId])

  const handleBack = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('You have unsaved changes. Discard them?')
      if (!ok) return
    }
    navigate(campaignId ? `/campaigns` : '/')
  }, [isDirty, navigate, campaignId])

  if (isLoading && !isNew) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const titleName = meta.funnelName?.trim() || (isNew ? 'New funnel' : 'Funnel')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ReactFlowProvider>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-3 py-2 sm:px-4">
            <Button type="text" size="small" className="shrink-0 gap-1" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Campaigns</span>
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold sm:text-base" title={titleName}>
                {titleName}
              </h1>
            </div>

            {isDirty && (
              <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md px-2 py-0.5">
                Unsaved
              </span>
            )}

            <Button
              type="text"
              size="small"
              className="shrink-0"
              title="Funnel settings"
              aria-label="Funnel settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {!isNew && canViewStats && campaignId && funnelId && (
              <Button
                type="text"
                size="small"
                className="shrink-0"
                title="Quick Stats"
                aria-label="Quick Stats"
                onClick={() => setQuickStatsOpen(true)}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}

            <Button
              type="primary"
              size="small"
              className="shrink-0 bg-orange-600 text-white hover:bg-orange-600/90"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save
            </Button>
          </header>

          <div className="relative min-h-0 flex-1">
            <FunnelCanvas className="absolute inset-0 min-h-0" />
          </div>
        </div>
      </ReactFlowProvider>

      <FunnelSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isNew={isNew}
        titleName={titleName}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {!isNew && campaignId && funnelId && (
        <FunnelQuickStatsModal
          open={quickStatsOpen}
          onClose={() => setQuickStatsOpen(false)}
          campaignId={campaignId}
          funnelId={funnelId}
          funnelName={titleName}
        />
      )}
    </div>
  )
}
