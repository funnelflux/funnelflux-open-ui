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
import { HeatmapOverlay } from '@/components/funnel-builder/HeatmapOverlay'
import { useToastApi, ConfirmModal } from '@/components/ui-kit'
import { Button } from '@/components/ui-kit'
import { useAuthStore } from '@/store/auth'
import { Icon } from '@/components/ui-kit/icons'
import {
  buildV2SavePayload,
  extractPersistExtras,
  computeFunnelEditorHydrationVersion,
  type FunnelPersistExtras,
} from '@/lib/funnelApiV2'
import { generateId } from '@/lib/id-generator'
import { validateFunnelGraph } from '@/lib/funnel-graph/validateGraph'
import type { FunnelCondition, Page } from '@/types/entities'

export function FunnelEditorPage() {
  const { campaignId, funnelId } = useParams<{ campaignId: string; funnelId: string }>()
  const navigate = useNavigate()
  const toast = useToastApi()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickStatsOpen, setQuickStatsOpen] = useState(false)
  const [serverRefreshOpen, setServerRefreshOpen] = useState(false)
  const canViewStats = useAuthStore((s) => s.user?.permissions.stats.canView)

  const dismissedServerVersionRef = useRef<string | null>(null)
  const pendingServerFunnelRef = useRef<unknown>(null)

  const isNew = funnelId === 'new'
  const { data: funnel, isLoading } = useFunnel(isNew ? '' : funnelId ?? '', {
    loadDependencies: true,
    staticWhileMounted: true,
  })

  const requestHydrate = useFunnelEditorStore((s) => s.requestHydrate)
  const resetEditor = useFunnelEditorStore((s) => s.resetEditor)
  const initializeNewFunnel = useFunnelEditorStore((s) => s.initializeNewFunnel)
  const meta = useFunnelEditorStore((s) => s.meta)
  const nodes = useFunnelEditorStore((s) => s.nodes)
  const edges = useFunnelEditorStore((s) => s.edges)
  const isDirty = useFunnelEditorStore((s) => s.isDirty)
  const markClean = useFunnelEditorStore((s) => s.markClean)
  const pendingPageDrafts = useFunnelEditorStore((s) => s.pendingPageDrafts)
  const pendingConditionDrafts = useFunnelEditorStore((s) => s.pendingConditionDrafts)
  const clearPendingAssetDrafts = useFunnelEditorStore((s) => s.clearPendingAssetDrafts)

  const persistExtrasRef = useRef<FunnelPersistExtras>({})

  const showGraphWarnings = useCallback(
    (messages: string[]) => {
      if (messages.length === 0) return
      toast.warning(messages.join(' '))
    },
    [toast],
  )

  useEffect(() => {
    if (isNew) {
      dismissedServerVersionRef.current = null
      resetEditor()
      if (campaignId) {
        initializeNewFunnel({ idCampaign: campaignId, idFunnel: generateId() })
      }
      return
    }
    if (!funnel) return
    const version = computeFunnelEditorHydrationVersion(funnel)
    if (dismissedServerVersionRef.current === version) {
      return
    }
    persistExtrasRef.current = extractPersistExtras(funnel)
    const result = requestHydrate(funnel)
    if (result.applied) {
      showGraphWarnings(result.graphWarnings.map((w) => w.message))
    }
    if (!result.applied && result.reason === 'dirty') {
      pendingServerFunnelRef.current = funnel
      setServerRefreshOpen(true)
    }
  }, [
    funnel,
    isNew,
    campaignId,
    initializeNewFunnel,
    resetEditor,
    requestHydrate,
    showGraphWarnings,
  ])

  const handleServerRefreshCancel = useCallback(() => {
    const raw = pendingServerFunnelRef.current
    if (raw != null) {
      dismissedServerVersionRef.current = computeFunnelEditorHydrationVersion(raw)
    }
    pendingServerFunnelRef.current = null
    setServerRefreshOpen(false)
  }, [])

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const handleOpenQuickStats = useCallback(() => {
    setQuickStatsOpen(true)
  }, [])

  const handleServerRefreshConfirm = useCallback(() => {
    const raw = pendingServerFunnelRef.current
    pendingServerFunnelRef.current = null
    setServerRefreshOpen(false)
    dismissedServerVersionRef.current = null
    if (raw == null) return
    persistExtrasRef.current = extractPersistExtras(raw)
    const result = requestHydrate(raw, { force: true })
    if (result.applied) {
      showGraphWarnings(result.graphWarnings.map((w) => w.message))
    }
    clearPendingAssetDrafts()
  }, [clearPendingAssetDrafts, requestHydrate, showGraphWarnings])

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
    const { errors } = validateFunnelGraph(nodes, edges, { forSave: true })
    if (errors.length > 0) {
      toast.error(errors[0]?.message ?? 'Cannot save: funnel graph is invalid.')
      return
    }

    const body = buildV2SavePayload(meta, nodes, edges, persistExtrasRef.current)
    setIsSaving(true)
    const savedPages: Array<{ page: Partial<Page>; original?: Partial<Page>; isCreate?: boolean }> = []
    const savedConditions: Array<{ condition: FunnelCondition; original?: FunnelCondition; isCreate?: boolean }> = []
    try {
      for (const draft of Object.values(pendingPageDrafts)) {
        const isCreate = draft.isCreate ?? !draft.original?.idPage
        await (isCreate
          ? api.post<Page>('/data/page/save/', draft.page)
          : api.put<Page>('/data/page/save/', draft.page))
        savedPages.push({ ...draft, isCreate })
      }

      for (const draft of Object.values(pendingConditionDrafts)) {
        const isCreate = draft.isCreate ?? !draft.original?.idCondition
        await (isCreate
          ? api.post<void>('/data/campaign/funnel/condition/save/', draft.condition)
          : api.put<void>('/data/campaign/funnel/condition/save/', draft.condition))
        savedConditions.push({ ...draft, isCreate })
      }

      if (isNew) {
        await api.post('/data/campaign/funnel/save/', body)
        markClean()
        clearPendingAssetDrafts()
        dismissedServerVersionRef.current = null
        await queryClient.invalidateQueries({ queryKey: queryKeys.funnels.all })
        await queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
        await queryClient.invalidateQueries({ queryKey: queryKeys.conditions.all })
        toast.success('Funnel saved successfully')
        setSettingsOpen(false)
        navigate(`/campaigns/${campaignId}/funnels/${String(body.idFunnel)}`, { replace: true })
      } else {
        await api.put('/data/campaign/funnel/save/', body, { deleteDependencies: 'true' })
        markClean()
        clearPendingAssetDrafts()
        dismissedServerVersionRef.current = null
        await queryClient.invalidateQueries({ queryKey: queryKeys.funnels.all })
        await queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
        await queryClient.invalidateQueries({ queryKey: queryKeys.conditions.all })
        if (funnelId) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.funnels.detail(funnelId) })
        }
        toast.success('Funnel saved successfully')
        setSettingsOpen(false)
      }
    } catch {
      for (const draft of savedConditions.reverse()) {
        try {
          const isCreate = draft.isCreate ?? !draft.original?.idCondition
          if (!isCreate && draft.original?.idCondition) {
            await api.put<void>('/data/campaign/funnel/condition/save/', draft.original)
          } else if (isCreate && draft.condition.idCondition) {
            await api.delete('/data/campaign/funnel/condition/delete/', { idCondition: draft.condition.idCondition })
          }
        } catch {
          // Best-effort rollback; keep the funnel dirty if rollback also fails.
        }
      }
      for (const draft of savedPages.reverse()) {
        try {
          const isCreate = draft.isCreate ?? !draft.original?.idPage
          if (!isCreate && draft.original?.idPage) {
            await api.put<Page>('/data/page/save/', draft.original)
          } else if (isCreate && draft.page.idPage) {
            await api.delete('/data/page/delete/', { idPage: String(draft.page.idPage) })
          }
        } catch {
          // Best-effort rollback; keep the funnel dirty if rollback also fails.
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.conditions.all })
      toast.error('Failed to save funnel')
    } finally {
      setIsSaving(false)
    }
  }, [
    meta,
    nodes,
    edges,
    markClean,
    clearPendingAssetDrafts,
    pendingPageDrafts,
    pendingConditionDrafts,
    toast,
    isNew,
    navigate,
    campaignId,
    queryClient,
    funnelId,
  ])

  const handleDiscard = useCallback(() => {
    if (!isDirty || isSaving) return
    if (!isNew && !funnel) return
    const ok = window.confirm('Discard all unsaved changes?')
    if (!ok) return
    if (isNew) {
      resetEditor()
      if (campaignId) {
        initializeNewFunnel({ idCampaign: campaignId, idFunnel: generateId() })
      }
      clearPendingAssetDrafts()
      markClean()
      return
    }
    persistExtrasRef.current = extractPersistExtras(funnel)
    requestHydrate(funnel, { force: true })
    clearPendingAssetDrafts()
  }, [
    isDirty,
    isSaving,
    isNew,
    campaignId,
    funnel,
    initializeNewFunnel,
    markClean,
    clearPendingAssetDrafts,
    requestHydrate,
    resetEditor,
  ])

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
        <span className="text-muted-foreground inline-flex [&>svg]:h-6 [&>svg]:w-6">
          <Icon name="loader-2" size="lg" animation="spin" />
        </span>
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
              <Icon name="arrow-left" size="md" />
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
              onClick={handleOpenSettings}
            >
              <Icon name="settings" size="md" />
            </Button>

            {!isNew && canViewStats && campaignId && funnelId && (
              <Button
                type="text"
                size="small"
                className="shrink-0"
                title="Quick Stats"
                aria-label="Quick Stats"
                onClick={handleOpenQuickStats}
              >
                <Icon name="bar-chart-3" size="md" />
              </Button>
            )}

            <Button
              size="small"
              className="shrink-0"
              onClick={handleDiscard}
              disabled={!isDirty || isSaving}
              title={isDirty ? 'Revert to last saved version' : 'No unsaved changes'}
            >
              <span className="mr-1.5 inline-flex">
                <Icon name="rotate-ccw" size="md" />
              </span>
              Discard
            </Button>

            <Button
              type="primary"
              size="small"
              uiVariant="default"
              className="shrink-0"
              onClick={handleSave}
              disabled={isSaving}
              iconName={isSaving ? 'loader-2' : 'save'}
              iconAnimation={isSaving ? 'spin' : 'none'}
            >
              Save
            </Button>
          </header>

          <HeatmapOverlay
            funnelId={funnelId ?? ''}
            campaignId={campaignId}
            enabled={Boolean(canViewStats)}
            isNew={isNew}
          >
            <div className="relative min-h-0 flex-1">
              <FunnelCanvas className="absolute inset-0 min-h-0" />
            </div>
          </HeatmapOverlay>
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

      <ConfirmModal
        open={serverRefreshOpen}
        title="Funnel updated on server"
        description="A newer version of this funnel is available. Load it and discard your unsaved local changes?"
        confirmText="Load server version"
        cancelText="Keep editing"
        danger
        onCancel={handleServerRefreshCancel}
        onConfirm={handleServerRefreshConfirm}
      />
    </div>
  )
}
