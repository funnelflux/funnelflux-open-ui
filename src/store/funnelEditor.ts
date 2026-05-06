import { create } from 'zustand'
import type {
  FunnelFlowNode,
  FunnelFlowEdge,
  FunnelNodeData,
  FunnelEdgeData,
  ApiFunnel,
  ApiFunnelNode,
  ApiFunnelConnection,
  NodeTypeValue,
} from '@/types/funnel'
import type { FunnelCondition, Page } from '@/types/entities'
import { generateId } from '@/lib/id-generator'
import { extractMetaFromRawFunnel, normalizeFunnelApiResponse, computeFunnelEditorHydrationVersion } from '@/lib/funnelApiV2'
import { percentToPixel, pixelToPercent } from '@/lib/funnelCoords'
import { materializeRotatorWeights, reclassifyLoadedRotatorEdges } from '@/lib/rotatorWeights'
import {
  coerceCodeEdgeRoles,
  coerceJsPhpCodeOutboundHandles,
  coerceJsPhpInboundTargetHandles,
  coerceVisitorTagOutboundEdges,
} from '@/lib/funnel-graph/graphHydrationCoercion'
import { CODE_NODE_MAX_ON_DONE_EXITS } from '@/lib/codeNodeExits'
import { createDefaultEntranceFlowNode } from '@/lib/defaultNewFunnelNodes'
import type { FunnelEditorMeta } from '@/types/funnel'

import { validateFunnelGraph, type GraphIssue } from '@/lib/funnel-graph/validateGraph'

export { percentToPixel, pixelToPercent } from '@/lib/funnelCoords'

export type HydrateRequestResult =
  | { applied: true; graphWarnings: GraphIssue[] }
  | { applied: false; reason: 'sameVersion' | 'dirty' }

// ── Helpers: API → React Flow ───────────────────────────────────────────────

function apiNodeToFlowNode(apiNode: ApiFunnelNode): FunnelFlowNode {
  const pos = percentToPixel(apiNode.percentPosX, apiNode.percentPosY)
  return {
    id: apiNode.idNode,
    type: getNodeComponentType(apiNode.nodeType as NodeTypeValue),
    position: { x: pos.x, y: pos.y },
    data: {
      nodeType: apiNode.nodeType as NodeTypeValue,
      label: apiNode.nodeName,
      params: apiNode.nodeParams as FunnelNodeData['params'],
      isEntrance: apiNode.nodeType === 0,
    },
  }
}

function apiConnectionToFlowEdge(conn: ApiFunnelConnection): FunnelFlowEdge {
  const data = parseEdgeData(conn)
  return {
    id: conn.idConnection,
    source: conn.idSourceNode,
    target: conn.idTargetNode,
    sourceHandle: conn.sourceHandle,
    targetHandle: conn.targetHandle,
    type: data.edgeType,
    data,
  }
}

function parseEdgeData(conn: ApiFunnelConnection): FunnelEdgeData {
  const el = conn.elementData || {}
  const ll = conn.labelLocation
  if (el.branch === 'yes' || el.branch === 'no') {
    return { edgeType: 'condition', branch: el.branch as 'yes' | 'no', labelLocation: ll }
  }
  if (typeof el.actionNumber === 'number') {
    return {
      edgeType: 'action',
      actionNumber: el.actionNumber as number,
      isConversion: el.isConversion === true,
      labelLocation: ll,
    }
  }
  if (el.edgeType === 'code') {
    const raw = typeof el.onDoneNumber === 'number' ? el.onDoneNumber : 1
    const onDoneNumber = Math.min(
      CODE_NODE_MAX_ON_DONE_EXITS,
      Math.max(1, Math.floor(Number.isFinite(raw) ? raw : 1)),
    )
    return {
      edgeType: 'code',
      onDoneNumber,
      labelLocation: ll,
    }
  }
  // Persisted weights are treated as user-set (locked). New edges added in the
  // editor start unlocked so they auto-split with their siblings.
  return { edgeType: 'weighted', weight: conn.weight ?? 100, locked: true, labelLocation: ll }
}

// ── Helpers: React Flow → API ───────────────────────────────────────────────

function flowNodeToApiNode(node: FunnelFlowNode, idFunnel: string): ApiFunnelNode {
  const pct = pixelToPercent(node.position.x, node.position.y)
  return {
    idNode: node.id,
    idFunnel,
    nodeType: node.data.nodeType,
    nodeName: node.data.label,
    nodeParams: node.data.params as Record<string, unknown>,
    percentPosX: pct.percentPosX,
    percentPosY: pct.percentPosY,
  }
}

function flowEdgeToApiConnection(edge: FunnelFlowEdge, idFunnel: string): ApiFunnelConnection {
  const conn: ApiFunnelConnection = {
    idConnection: edge.id,
    idFunnel,
    idSourceNode: edge.source,
    idTargetNode: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    labelLocation: edge.data?.labelLocation,
  }
  const data = edge.data
  if (data) {
    if (data.edgeType === 'weighted') {
      conn.weight = data.weight
    } else if (data.edgeType === 'action') {
      conn.elementData = { actionNumber: data.actionNumber, isConversion: data.isConversion ?? false }
    } else if (data.edgeType === 'condition') {
      conn.elementData = { branch: data.branch }
    } else if (data.edgeType === 'code') {
      conn.elementData = { edgeType: 'code', onDoneNumber: data.onDoneNumber ?? 1 }
    }
  }
  return conn
}

// ── Node Component Type Mapping ─────────────────────────────────────────────

const NODE_TYPE_MAP: Record<NodeTypeValue, string> = {
  0: 'root',
  1: 'rotator',
  2: 'lander',
  3: 'offer',
  4: 'externalUrl',
  5: 'condition',
  6: 'jsCode',
  7: 'phpCode',
  8: 'visitorTag',
}

function getNodeComponentType(nodeType: NodeTypeValue): string {
  return NODE_TYPE_MAP[nodeType] ?? 'root'
}

// ── Store ───────────────────────────────────────────────────────────────────

type FunnelMeta = FunnelEditorMeta

const defaultMeta: FunnelMeta = {
  idFunnel: '',
  idCampaign: '',
  funnelName: '',
  defaultCostPerEntrance: 0,
  notes: '',
  isArchived: false,
  canvasWidth: null,
  canvasHeight: null,
  customTokens: [],
  acculumatedUrlParams: [],
  incomingTrafficCostOverrides: [],
  postbackOverrides: [],
}

interface FunnelEditorState {
  /** Last server snapshot identity; null for client-only / new funnel. */
  loadedFunnelId: string | null
  loadedServerVersion: string | null

  // Data
  nodes: FunnelFlowNode[]
  edges: FunnelFlowEdge[]
  meta: FunnelMeta
  selectedNodeId: string | null
  selectedEdgeId: string | null
  isDirty: boolean
  pendingPageDrafts: Record<string, { page: Partial<Page>; original?: Partial<Page>; isCreate?: boolean }>
  pendingConditionDrafts: Record<string, { condition: FunnelCondition; original?: FunnelCondition; isCreate?: boolean }>

  // Actions
  /** Apply server funnel JSON and record `serverVersion` (from {@link computeFunnelEditorHydrationVersion}). */
  hydrateFromServer: (funnel: ApiFunnel | unknown, serverVersion: string) => void
  requestHydrate: (funnelInput: ApiFunnel | unknown, opts?: { force?: boolean }) => HydrateRequestResult
  initializeNewFunnel: (args: { idCampaign: string; idFunnel: string }) => void
  resetEditor: () => void
  serialize: () => ApiFunnel

  /** When `markDirty` is false, graph is updated without setting unsaved (e.g. RF measure/select, handle sync). */
  setNodes: (nodes: FunnelFlowNode[], markDirty?: boolean) => void
  setEdges: (edges: FunnelFlowEdge[], markDirty?: boolean) => void
  updateMeta: (partial: Partial<FunnelMeta>) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  markClean: () => void

  /** Ensures a new funnel canvas has one root (traffic/entrance) node; no-op if nodes already exist. */
  seedDefaultEntranceNode: () => void

  addNode: (nodeType: NodeTypeValue, position: { x: number; y: number }, data?: Partial<FunnelNodeData>) => string
  removeNode: (id: string) => void
  updateNodeData: (id: string, data: Partial<FunnelNodeData>) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void

  addEdge: (source: string, target: string, data: FunnelEdgeData, sourceHandle?: string, targetHandle?: string) => string
  removeEdge: (id: string) => void
  updateEdgeData: (id: string, data: Partial<FunnelEdgeData>) => void
  setPendingPageDraft: (nodeId: string, draft: { page: Partial<Page>; original?: Partial<Page>; isCreate?: boolean }) => void
  setPendingConditionDraft: (
    nodeId: string,
    draft: { condition: FunnelCondition; original?: FunnelCondition; isCreate?: boolean },
  ) => void
  clearPendingAssetDrafts: () => void
}

export const useFunnelEditorStore = create<FunnelEditorState>((set, get) => ({
  loadedFunnelId: null,
  loadedServerVersion: null,
  nodes: [],
  edges: [],
  meta: { ...defaultMeta },
  selectedNodeId: null,
  selectedEdgeId: null,
  isDirty: false,
  pendingPageDrafts: {},
  pendingConditionDrafts: {},

  hydrateFromServer: (funnelInput, serverVersion) => {
    const funnel = normalizeFunnelApiResponse(funnelInput)
    const v2Meta = extractMetaFromRawFunnel(funnelInput)
    const raw = funnelInput as Record<string, unknown>

    const flowNodes = funnel.nodes.map(apiNodeToFlowNode)
    const flowEdges = coerceJsPhpInboundTargetHandles(
      flowNodes,
      coerceJsPhpCodeOutboundHandles(
        flowNodes,
        coerceCodeEdgeRoles(
          flowNodes,
          coerceVisitorTagOutboundEdges(
            flowNodes,
            reclassifyLoadedRotatorEdges(funnel.connections.map(apiConnectionToFlowEdge)),
          ),
        ),
      ),
    )

    set({
      loadedFunnelId: funnel.idFunnel,
      loadedServerVersion: serverVersion,
      nodes: flowNodes,
      edges: flowEdges,
      meta: {
        idFunnel: funnel.idFunnel,
        idCampaign: funnel.idCampaign,
        funnelName: funnel.funnelName,
        defaultCostPerEntrance: funnel.defaultCostPerEntrance,
        isArchived: funnel.isArchived,
        ...v2Meta,
        notes: String(raw.notes ?? ''),
      },
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      pendingPageDrafts: {},
      pendingConditionDrafts: {},
    })
  },

  requestHydrate: (funnelInput, opts) => {
    const force = opts?.force === true
    const version = computeFunnelEditorHydrationVersion(funnelInput)
    const funnel = normalizeFunnelApiResponse(funnelInput)
    const funnelId = funnel.idFunnel
    const { isDirty, loadedServerVersion, loadedFunnelId } = get()

    if (!force && version === loadedServerVersion && funnelId === loadedFunnelId) {
      return { applied: false, reason: 'sameVersion' }
    }
    if (!force && isDirty) {
      return { applied: false, reason: 'dirty' }
    }

    get().hydrateFromServer(funnelInput, version)
    const { nodes, edges } = get()
    const { warnings } = validateFunnelGraph(nodes, edges, { forSave: false })
    return { applied: true, graphWarnings: warnings }
  },

  initializeNewFunnel: ({ idCampaign, idFunnel }) => {
    const idNode = generateId()
    set({
      loadedFunnelId: idFunnel,
      loadedServerVersion: null,
      nodes: [createDefaultEntranceFlowNode(idNode)],
      edges: [],
      meta: {
        ...defaultMeta,
        idCampaign,
        idFunnel,
        funnelName: '',
        defaultCostPerEntrance: 0,
        notes: '',
        isArchived: false,
      },
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      pendingPageDrafts: {},
      pendingConditionDrafts: {},
    })
  },

  resetEditor: () => {
    set({
      loadedFunnelId: null,
      loadedServerVersion: null,
      nodes: [],
      edges: [],
      meta: { ...defaultMeta },
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      pendingPageDrafts: {},
      pendingConditionDrafts: {},
    })
  },

  serialize: () => {
    const { nodes, edges, meta } = get()
    const materialized = materializeRotatorWeights(edges)
    return {
      idFunnel: meta.idFunnel,
      idCampaign: meta.idCampaign,
      funnelName: meta.funnelName,
      defaultCostPerEntrance: meta.defaultCostPerEntrance,
      isArchived: meta.isArchived,
      nodes: nodes.map((n) => flowNodeToApiNode(n, meta.idFunnel)),
      connections: materialized.map((e) => flowEdgeToApiConnection(e, meta.idFunnel)),
    }
  },

  setNodes: (nodes, markDirty = true) =>
    set((s) => ({ nodes, isDirty: markDirty ? true : s.isDirty })),
  setEdges: (edges, markDirty = true) =>
    set((s) => ({ edges, isDirty: markDirty ? true : s.isDirty })),
  updateMeta: (partial) =>
    set((s) => ({ meta: { ...s.meta, ...partial }, isDirty: true })),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
  markClean: () => set({ isDirty: false }),

  seedDefaultEntranceNode: () => {
    if (get().nodes.length > 0) return
    const idNode = generateId()
    const { meta } = get()
    set({
      nodes: [createDefaultEntranceFlowNode(idNode)],
      edges: [],
      isDirty: false,
      loadedFunnelId: meta.idFunnel || null,
      loadedServerVersion: null,
    })
  },

  addNode: (nodeType, position, data) => {
    const id = generateId()
    const newNode: FunnelFlowNode = {
      id,
      type: getNodeComponentType(nodeType),
      position,
      data: {
        nodeType,
        label: data?.label ?? '',
        params: data?.params ?? {},
        isEntrance: nodeType === (0 as NodeTypeValue),
        ...data,
      },
    }
    set((s) => ({ nodes: [...s.nodes, newNode], isDirty: true }))
    return id
  },

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      pendingPageDrafts: Object.fromEntries(
        Object.entries(s.pendingPageDrafts).filter(([nodeId]) => nodeId !== id),
      ),
      pendingConditionDrafts: Object.fromEntries(
        Object.entries(s.pendingConditionDrafts).filter(([nodeId]) => nodeId !== id),
      ),
      isDirty: true,
    })),

  updateNodeData: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      isDirty: true,
    })),

  updateNodePosition: (id, position) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, position } : n,
      ),
      isDirty: true,
    })),

  addEdge: (source, target, data, sourceHandle, targetHandle) => {
    const id = generateId()
    const newEdge: FunnelFlowEdge = {
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: data.edgeType,
      data,
    }
    set((s) => ({ edges: [...s.edges, newEdge], isDirty: true }))
    return id
  },

  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
      isDirty: true,
    })),

  updateEdgeData: (id, data) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, ...data } as FunnelEdgeData } : e,
      ),
      isDirty: true,
    })),

  setPendingPageDraft: (nodeId, draft) =>
    set((s) => ({
      pendingPageDrafts: { ...s.pendingPageDrafts, [nodeId]: draft },
      isDirty: true,
    })),

  setPendingConditionDraft: (nodeId, draft) =>
    set((s) => ({
      pendingConditionDrafts: { ...s.pendingConditionDrafts, [nodeId]: draft },
      isDirty: true,
    })),

  clearPendingAssetDrafts: () =>
    set({ pendingPageDrafts: {}, pendingConditionDrafts: {} }),
}))
