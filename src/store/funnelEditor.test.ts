import { beforeEach, describe, expect, it } from 'vitest'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { computeFunnelEditorHydrationVersion } from '@/lib/funnelApiV2'

const minimalServerFunnelA = {
  idFunnel: 'f-1',
  idCampaign: 'c-1',
  funnelName: 'Funnel A',
  defaultCostPerEntrance: 0,
  isArchived: false,
  notes: '',
  nodes: [
    {
      idNode: 'n-root',
      idFunnel: 'f-1',
      nodeName: 'Entrance',
      nodeType: 'root',
      posX: 0.12,
      posY: 0.2,
      nodeRotatorParams: { rotatorType: 'random' },
    },
  ],
  connections: [],
}

const minimalServerFunnelB = {
  ...minimalServerFunnelA,
  funnelName: 'Funnel A renamed',
}

beforeEach(() => {
  useFunnelEditorStore.getState().resetEditor()
})

describe('useFunnelEditorStore hydration', () => {
  it('initializeNewFunnel creates exactly one entrance node', () => {
    useFunnelEditorStore.getState().initializeNewFunnel({ idCampaign: 'c1', idFunnel: 'f-new' })
    const { nodes, loadedFunnelId, loadedServerVersion, isDirty } = useFunnelEditorStore.getState()
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.data.nodeType).toBe(0)
    expect(nodes[0]?.data.isEntrance).toBe(true)
    expect(loadedFunnelId).toBe('f-new')
    expect(loadedServerVersion).toBeNull()
    expect(isDirty).toBe(false)
  })

  it('requestHydrate applies first server payload', () => {
    const result = useFunnelEditorStore.getState().requestHydrate(minimalServerFunnelA)
    expect(result.applied).toBe(true)
    const { nodes, loadedFunnelId, isDirty } = useFunnelEditorStore.getState()
    expect(nodes).toHaveLength(1)
    expect(loadedFunnelId).toBe('f-1')
    expect(isDirty).toBe(false)
  })

  it('requestHydrate returns sameVersion when server unchanged and clean', () => {
    useFunnelEditorStore.getState().requestHydrate(minimalServerFunnelA)
    const again = useFunnelEditorStore.getState().requestHydrate(minimalServerFunnelA)
    expect(again.applied).toBe(false)
    if (!again.applied) expect(again.reason).toBe('sameVersion')
  })

  it('requestHydrate returns dirty when local edits exist and server snapshot changed', () => {
    useFunnelEditorStore.getState().requestHydrate(minimalServerFunnelA)
    useFunnelEditorStore.getState().updateMeta({ funnelName: 'Local edit' })
    const next = useFunnelEditorStore.getState().requestHydrate(minimalServerFunnelB)
    expect(next.applied).toBe(false)
    if (!next.applied) expect(next.reason).toBe('dirty')
  })

  it('requestHydrate with force applies while dirty', () => {
    useFunnelEditorStore.getState().requestHydrate(minimalServerFunnelA)
    useFunnelEditorStore.getState().updateMeta({ funnelName: 'Local edit' })
    const forced = useFunnelEditorStore.getState().requestHydrate(minimalServerFunnelB, { force: true })
    expect(forced.applied).toBe(true)
    expect(useFunnelEditorStore.getState().meta.funnelName).toContain('renamed')
    expect(useFunnelEditorStore.getState().isDirty).toBe(false)
  })

  it('computeFunnelEditorHydrationVersion changes when funnelName changes', () => {
    const v1 = computeFunnelEditorHydrationVersion(minimalServerFunnelA)
    const v2 = computeFunnelEditorHydrationVersion(minimalServerFunnelB)
    expect(v1).not.toBe(v2)
  })
})
