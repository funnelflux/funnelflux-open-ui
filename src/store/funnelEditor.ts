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
import { generateId } from '@/lib/id-generator'

// ── Coordinate Conversion ───────────────────────────────────────────────────

const CANVAS_WIDTH = 2000
const CANVAS_HEIGHT = 1500

export function percentToPixel(percentX: number, percentY: number) {
  return {
    x: (percentX / 100) * CANVAS_WIDTH,
    y: (percentY / 100) * CANVAS_HEIGHT,
  }
}

export function pixelToPercent(x: number, y: number) {
  return {
    percentPosX: Math.round((x / CANVAS_WIDTH) * 100 * 100) / 100,
    percentPosY: Math.round((y / CANVAS_HEIGHT) * 100 * 100) / 100,
  }
}

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
  if (el.branch === 'yes' || el.branch === 'no') {
    return { edgeType: 'condition', branch: el.branch as 'yes' | 'no' }
  }
  if (typeof el.actionNumber === 'number') {
    return { edgeType: 'action', actionNumber: el.actionNumber as number }
  }
  if (el.edgeType === 'code') {
    return { edgeType: 'code' }
  }
  return { edgeType: 'weighted', weight: conn.weight ?? 100 }
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
  }
  const data = edge.data
  if (data) {
    if (data.edgeType === 'weighted') {
      conn.weight = data.weight
    } else if (data.edgeType === 'action') {
      conn.elementData = { actionNumber: data.actionNumber }
    } else if (data.edgeType === 'condition') {
      conn.elementData = { branch: data.branch }
    } else if (data.edgeType === 'code') {
      conn.elementData = { edgeType: 'code' }
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

interface FunnelMeta {
  idFunnel: string
  idCampaign: string
  funnelName: string
  defaultCostPerEntrance: number
  defaultRedirectUrl: string
  defaultOverflowUrl: string
  deduplicateByIp: boolean
  deduplicateWindowHours: number
  isArchived: boolean
}

const defaultMeta: FunnelMeta = {
  idFunnel: '',
  idCampaign: '',
  funnelName: '',
  defaultCostPerEntrance: 0,
  defaultRedirectUrl: '',
  defaultOverflowUrl: '',
  deduplicateByIp: false,
  deduplicateWindowHours: 24,
  isArchived: false,
}

interface FunnelEditorState {
  // Data
  nodes: FunnelFlowNode[]
  edges: FunnelFlowEdge[]
  meta: FunnelMeta
  selectedNodeId: string | null
  selectedEdgeId: string | null
  isDirty: boolean

  // Actions
  hydrate: (funnel: ApiFunnel) => void
  reset: () => void
  serialize: () => ApiFunnel

  setNodes: (nodes: FunnelFlowNode[]) => void
  setEdges: (edges: FunnelFlowEdge[]) => void
  updateMeta: (partial: Partial<FunnelMeta>) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  markClean: () => void

  addNode: (nodeType: NodeTypeValue, position: { x: number; y: number }, data?: Partial<FunnelNodeData>) => string
  removeNode: (id: string) => void
  updateNodeData: (id: string, data: Partial<FunnelNodeData>) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void

  addEdge: (source: string, target: string, data: FunnelEdgeData, sourceHandle?: string, targetHandle?: string) => string
  removeEdge: (id: string) => void
  updateEdgeData: (id: string, data: Partial<FunnelEdgeData>) => void
}

export const useFunnelEditorStore = create<FunnelEditorState>((set, get) => ({
  nodes: [],
  edges: [],
  meta: { ...defaultMeta },
  selectedNodeId: null,
  selectedEdgeId: null,
  isDirty: false,

  hydrate: (funnel) => {
    set({
      nodes: funnel.nodes.map(apiNodeToFlowNode),
      edges: funnel.connections.map(apiConnectionToFlowEdge),
      meta: {
        idFunnel: funnel.idFunnel,
        idCampaign: funnel.idCampaign,
        funnelName: funnel.funnelName,
        defaultCostPerEntrance: funnel.defaultCostPerEntrance,
        defaultRedirectUrl: funnel.defaultRedirectUrl ?? '',
        defaultOverflowUrl: funnel.defaultOverflowUrl ?? '',
        deduplicateByIp: funnel.deduplicateByIp ?? false,
        deduplicateWindowHours: funnel.deduplicateWindowHours ?? 24,
        isArchived: funnel.isArchived,
      },
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
    })
  },

  reset: () => {
    set({
      nodes: [],
      edges: [],
      meta: { ...defaultMeta },
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
    })
  },

  serialize: () => {
    const { nodes, edges, meta } = get()
    return {
      idFunnel: meta.idFunnel,
      idCampaign: meta.idCampaign,
      funnelName: meta.funnelName,
      defaultCostPerEntrance: meta.defaultCostPerEntrance,
      defaultRedirectUrl: meta.defaultRedirectUrl,
      defaultOverflowUrl: meta.defaultOverflowUrl,
      deduplicateByIp: meta.deduplicateByIp,
      deduplicateWindowHours: meta.deduplicateWindowHours,
      isArchived: meta.isArchived,
      nodes: nodes.map((n) => flowNodeToApiNode(n, meta.idFunnel)),
      connections: edges.map((e) => flowEdgeToApiConnection(e, meta.idFunnel)),
    }
  },

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  updateMeta: (partial) =>
    set((s) => ({ meta: { ...s.meta, ...partial }, isDirty: true })),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
  markClean: () => set({ isDirty: false }),

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
}))
