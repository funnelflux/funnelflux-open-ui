/**
 * Maps V2 REST funnel JSON (string node types, posX/Y 0–1, structured *Params)
 * to the internal editor shape (numeric nodeType, percent coords, flat nodeParams).
 * Also builds V2 payloads for save (PUT) from editor state.
 */
import { NODE_TYPES, type NodeTypeValue } from '@/types/funnel'
import type {
  ApiFunnel,
  ApiFunnelConnection,
  ApiFunnelNode,
  FunnelEditorMeta,
  FunnelFlowEdge,
  FunnelFlowNode,
  FunnelKeyValuePair,
  FunnelPostbackOverrideRow,
} from '@/types/funnel'
import { pixelToPercent } from '@/lib/funnelCoords'
import { materializeRotatorWeights } from '@/lib/rotatorWeights'
import {
  FUNNEL_NODE_API_NAME_BY_TYPE,
  FUNNEL_NODE_TYPE_BY_API_NAME,
} from '@/lib/funnelNodeTypeMaps'

export class FunnelHydrateError extends Error {
  readonly code = 'FUNNEL_HYDRATE' as const
  readonly nodeId?: string
  readonly nodeTypeRaw: string

  constructor(message: string, opts: { nodeId?: string; nodeTypeRaw: string }) {
    super(message)
    this.name = 'FunnelHydrateError'
    this.nodeId = opts.nodeId
    this.nodeTypeRaw = opts.nodeTypeRaw
  }
}

export type FunnelMetaForSave = FunnelEditorMeta

function posToPercent(pos: number): number {
  if (typeof pos !== 'number' || Number.isNaN(pos)) return 0
  // API uses 0–1 fractions; legacy editor uses 0–100
  if (pos >= 0 && pos <= 1) return pos * 100
  return pos
}

function isV2Node(n: Record<string, unknown>): boolean {
  return typeof n.nodeType === 'string'
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function conditionNameFromParams(params: unknown): string {
  if (!params || typeof params !== 'object') return ''
  const p = params as Record<string, unknown>
  const direct =
    stringOrEmpty(p.conditionName) ||
    stringOrEmpty(p.name) ||
    stringOrEmpty(p.label) ||
    stringOrEmpty(p.title)
  if (direct) return direct

  const nested = p.condition
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>
    return (
      stringOrEmpty(n.conditionName) ||
      stringOrEmpty(n.name) ||
      stringOrEmpty(n.label) ||
      stringOrEmpty(n.title)
    )
  }
  return ''
}

function conditionNodeDisplayName(node: Record<string, unknown>): string {
  return conditionNameFromParams(node.nodeConditionParams) || stringOrEmpty(node.nodeName) || 'Condition'
}

export function normalizeFunnelApiResponse(raw: unknown): ApiFunnel {
  const r = raw as Record<string, unknown>
  const nodesIn = (r.nodes ?? []) as Record<string, unknown>[]
  const connectionsIn = (r.connections ?? []) as Record<string, unknown>[]

  const nodes = nodesIn.map((n) => normalizeNode(n))
  const connections = connectionsIn.map((c) => normalizeConnection(c))

  return {
    idFunnel: String(r.idFunnel ?? ''),
    idCampaign: String(r.idCampaign ?? ''),
    funnelName: String(r.funnelName ?? ''),
    defaultCostPerEntrance: Number(r.defaultCostPerEntrance ?? 0),
    nodes,
    connections,
    isArchived: Boolean(r.isArchived),
  }
}

function parseKvArray(v: unknown): FunnelKeyValuePair[] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (item && typeof item === 'object' && 'key' in item && 'value' in item) {
        const o = item as Record<string, unknown>
        return { key: String(o.key ?? ''), value: String(o.value ?? '') }
      }
      return { key: '', value: '' }
    })
    .filter((row) => row.key !== '' || row.value !== '')
}

function parsePostbackArray(v: unknown): FunnelPostbackOverrideRow[] {
  if (!Array.isArray(v)) return []
  return v.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>
    return {
      idTrafficSource: String(o.idTrafficSource ?? ''),
      postbackType: String(o.postbackType ?? 'none'),
      postbackCode: String(o.postbackCode ?? ''),
    }
  })
}

/** Reads V2-only funnel fields from raw API JSON into editor meta (tokens, overrides, canvas size). */
export function extractMetaFromRawFunnel(raw: unknown): Omit<
  FunnelEditorMeta,
  'idFunnel' | 'idCampaign' | 'funnelName' | 'defaultCostPerEntrance' | 'isArchived' | 'notes'
> {
  const r = raw as Record<string, unknown>
  const cw = r.canvasWidth
  const ch = r.canvasHeight
  return {
    canvasWidth: cw != null && cw !== '' ? Number(cw) : null,
    canvasHeight: ch != null && ch !== '' ? Number(ch) : null,
    customTokens: parseKvArray(r.customTokens),
    acculumatedUrlParams: parseKvArray(r.acculumatedUrlParams),
    incomingTrafficCostOverrides: parseKvArray(r.incomingTrafficCostOverrides),
    postbackOverrides: parsePostbackArray(r.postbackOverrides),
  }
}

/**
 * Deterministic snapshot of server funnel JSON for hydration deduping.
 * When this string matches the last hydrated version, refetches must not reset the editor.
 */
export function computeFunnelEditorHydrationVersion(raw: unknown): string {
  const normalized = normalizeFunnelApiResponse(raw)
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const v2Meta = extractMetaFromRawFunnel(raw)
  const payload = {
    idFunnel: normalized.idFunnel,
    idCampaign: normalized.idCampaign,
    funnelName: normalized.funnelName,
    defaultCostPerEntrance: normalized.defaultCostPerEntrance,
    isArchived: normalized.isArchived,
    notes: String(r.notes ?? ''),
    canvasWidth: v2Meta.canvasWidth,
    canvasHeight: v2Meta.canvasHeight,
    customTokens: v2Meta.customTokens,
    acculumatedUrlParams: v2Meta.acculumatedUrlParams,
    incomingTrafficCostOverrides: v2Meta.incomingTrafficCostOverrides,
    postbackOverrides: v2Meta.postbackOverrides,
    nodes: normalized.nodes
      .map((n) => ({
        id: n.idNode,
        t: n.nodeType,
        x: n.percentPosX,
        y: n.percentPosY,
        name: n.nodeName,
        p: n.nodeParams,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    connections: normalized.connections
      .map((c) => ({
        id: c.idConnection,
        s: c.idSourceNode,
        t: c.idTargetNode,
        w: c.weight,
        sh: c.sourceHandle,
        th: c.targetHandle,
        ed: c.elementData,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
  return JSON.stringify(payload)
}

function normalizeNode(node: Record<string, unknown>): ApiFunnelNode {
  if (!isV2Node(node) && node.percentPosX !== undefined && node.nodeParams !== undefined) {
    const nodeTypeNum = Number(node.nodeType)
    if (!Number.isFinite(nodeTypeNum) || FUNNEL_NODE_API_NAME_BY_TYPE[nodeTypeNum as NodeTypeValue] === undefined) {
      throw new FunnelHydrateError(`Unknown funnel node type id: ${String(node.nodeType)}`, {
        nodeId: String(node.idNode),
        nodeTypeRaw: String(node.nodeType),
      })
    }
    return {
      idNode: String(node.idNode),
      idFunnel: String(node.idFunnel),
      nodeName: String(node.nodeName ?? ''),
      nodeType: nodeTypeNum as NodeTypeValue,
      nodeParams: (node.nodeParams ?? {}) as Record<string, unknown>,
      percentPosX: Number(node.percentPosX),
      percentPosY: Number(node.percentPosY),
      isArchived: Boolean(node.isArchived),
    }
  }

  const ntKey =
    node.nodeType == null || node.nodeType === '' ? 'root' : String(node.nodeType)
  // NODE_TYPES.root is 0 — must not use a truthy check on the map value.
  if (FUNNEL_NODE_TYPE_BY_API_NAME[ntKey] === undefined) {
    throw new FunnelHydrateError(`Unknown funnel node type: ${ntKey}`, {
      nodeId: String(node.idNode),
      nodeTypeRaw: ntKey,
    })
  }
  const nodeType = FUNNEL_NODE_TYPE_BY_API_NAME[ntKey]
  const px = posToPercent(Number(node.posX))
  const py = posToPercent(Number(node.posY))

  const nodeParams = buildNodeParamsFromV2(nodeType, node)
  const nodeName =
    nodeType === NODE_TYPES.condition
      ? conditionNodeDisplayName(node)
      : String(node.nodeName ?? '')

  return {
    idNode: String(node.idNode),
    idFunnel: String(node.idFunnel),
    nodeName,
    nodeType,
    nodeParams,
    percentPosX: px,
    percentPosY: py,
    isArchived: Boolean(node.isArchived),
  }
}

function buildNodeParamsFromV2(nodeType: NodeTypeValue, node: Record<string, unknown>): Record<string, unknown> {
  if (nodeType === NODE_TYPES.lander || nodeType === NODE_TYPES.offer) {
    const page = node.nodePageParams as {
      idPage?: string
      accumulateUrlParams?: boolean
      additionalTokens?: Array<{ key?: string; value?: string }>
    } | null | undefined
    if (page?.idPage) {
      const base: Record<string, unknown> = {
        pageId: String(page.idPage),
        pageName: String(node.nodeName ?? ''),
      }
      if (typeof page.accumulateUrlParams === 'boolean') {
        base.accumulateUrlParams = page.accumulateUrlParams
      }
      const rawTok = page.additionalTokens
      if (Array.isArray(rawTok) && rawTok.length > 0) {
        base.additionalTokens = rawTok
          .map((tokenPair) => ({
            field: String(tokenPair.key ?? ''),
            token: String(tokenPair.value ?? ''),
          }))
          .filter((row) => row.field !== '')
      }
      return base
    }
    return {}
  }
  if (nodeType === NODE_TYPES.externalUrl) {
    const ext = node.nodeExternalUrlParams as { url?: string } | null | undefined
    return ext?.url ? { url: ext.url } : {}
  }
  if (nodeType === NODE_TYPES.condition) {
    const cond = node.nodeConditionParams as { idCondition?: string } | null | undefined
    const conditionName = conditionNodeDisplayName(node)
    return cond?.idCondition
      ? { conditionId: String(cond.idCondition), conditionName }
      : {}
  }
  if (nodeType === NODE_TYPES.jsCode || nodeType === NODE_TYPES.phpCode) {
    const code = node.nodeCodeParams as { idCode?: string } | null | undefined
    return code?.idCode ? { snippetId: String(code.idCode), snippetName: String(node.nodeName ?? '') } : {}
  }
  if (nodeType === NODE_TYPES.visitorTag) {
    const apiVisitorTagParams = node.nodeVisitorTagParams as {
      tags?: Record<string, string> | string[] | Array<{ key?: string; value?: string }>
    } | null | undefined
    if (!apiVisitorTagParams?.tags) return {}
    if (Array.isArray(apiVisitorTagParams.tags)) {
      const firstWireTag = apiVisitorTagParams.tags[0]
      if (typeof firstWireTag === 'string') {
        return { tagId: firstWireTag, tagName: '' }
      }
      if (firstWireTag && typeof firstWireTag === 'object' && 'key' in firstWireTag) {
        return {
          tagId: String(firstWireTag.key ?? ''),
          tagName: String((firstWireTag as { value?: string }).value ?? ''),
        }
      }
      return {}
    }
    const idNameEntries = Object.entries(apiVisitorTagParams.tags)
    if (idNameEntries.length === 0) return {}
    return { tagId: idNameEntries[0][0], tagName: String(idNameEntries[0][1]) }
  }
  return {}
}

function normalizeConnection(conn: Record<string, unknown>): ApiFunnelConnection {
  const rawLabel = conn.labelLocation
  const labelLocation = typeof rawLabel === 'number' ? rawLabel : undefined

  const base = {
    idConnection: String(conn.idConnection),
    idFunnel: String(conn.idFunnel),
    idSourceNode: String(conn.idSourceNode),
    idTargetNode: String(conn.idTargetNode),
    sourceHandle: conn.sourceHandle as string | undefined,
    targetHandle: conn.targetHandle as string | undefined,
    labelLocation,
  }

  if (conn.connectionRotatorParams != null) {
    const w = (conn.connectionRotatorParams as { weight?: number }).weight ?? 1
    return { ...base, weight: w <= 1 ? w * 100 : w }
  }
  if (conn.connectionPageParams != null) {
    const pageParams = conn.connectionPageParams as { onActionNumber?: number; isConversion?: boolean }
    return {
      ...base,
      elementData: {
        actionNumber: pageParams.onActionNumber ?? 1,
        isConversion: pageParams.isConversion ?? false,
      },
    }
  }
  if (conn.connectionCodeParams != null) {
    const codeParams = conn.connectionCodeParams as { onDoneNumber?: number }
    return {
      ...base,
      elementData: { onDoneNumber: codeParams.onDoneNumber ?? 1, edgeType: 'code' },
    }
  }
  if (conn.connectionConditionParams != null) {
    const conditionParams = conn.connectionConditionParams as { condition?: string }
    const conditionToken = conditionParams.condition
    const branch = conditionToken === 'ifYes' || conditionToken === 'IF_YES' ? 'yes' : 'no'
    return { ...base, elementData: { branch } }
  }

  // Legacy / fallback
  return {
    ...base,
    weight: conn.weight !== undefined ? Number(conn.weight) : 100,
    elementData: (conn.elementData ?? {}) as Record<string, unknown>,
  }
}

/** Fields merged into V2 PUT body so we do not drop server-only data */
export interface FunnelPersistExtras {
  incomingTrafficCostOverrides?: Array<{ key: string; value: string }>
  postbackOverrides?: unknown[]
  acculumatedUrlParams?: Array<{ key: string; value: string }>
  customTokens?: Array<{ key: string; value: string }>
  canvasWidth?: number | null
  canvasHeight?: number | null
}

export function extractPersistExtras(raw: unknown): FunnelPersistExtras {
  const r = raw as Record<string, unknown>
  return {
    incomingTrafficCostOverrides: r.incomingTrafficCostOverrides as FunnelPersistExtras['incomingTrafficCostOverrides'],
    postbackOverrides: r.postbackOverrides as FunnelPersistExtras['postbackOverrides'],
    acculumatedUrlParams: r.acculumatedUrlParams as FunnelPersistExtras['acculumatedUrlParams'],
    customTokens: r.customTokens as FunnelPersistExtras['customTokens'],
    canvasWidth: r.canvasWidth as number | null | undefined,
    canvasHeight: r.canvasHeight as number | null | undefined,
  }
}

function percentToV2Pos(percent: number): number {
  return Math.round((percent / 100) * 1e6) / 1e6
}

function flowNodeToV2(node: FunnelFlowNode, idFunnel: string): Record<string, unknown> {
  const pct = pixelToPercent(node.position.x, node.position.y)
  const posX = percentToV2Pos(pct.percentPosX)
  const posY = percentToV2Pos(pct.percentPosY)
  const editorNodeType = node.data.nodeType
  const typeStr = FUNNEL_NODE_API_NAME_BY_TYPE[editorNodeType] ?? 'root'
  const editorParams = node.data.params as Record<string, unknown>

  const base: Record<string, unknown> = {
    idNode: node.id,
    idFunnel,
    nodeName: node.data.label,
    nodeType: typeStr,
    posX,
    posY,
    isArchived: false,
    nodeRotatorParams: null,
    nodePageParams: null,
    nodeExternalUrlParams: null,
    nodeCodeParams: null,
    nodeConditionParams: null,
    nodeVisitorTagParams: null,
  }

  if (editorNodeType === NODE_TYPES.root || editorNodeType === NODE_TYPES.rotator) {
    base.nodeRotatorParams = { rotatorType: 'random' }
  } else if (editorNodeType === NODE_TYPES.lander || editorNodeType === NODE_TYPES.offer) {
    const pageId = (editorParams.pageId as string) ?? '0'
    const accumulateUrlParams = Boolean(editorParams.accumulateUrlParams)
    const rows = (editorParams.additionalTokens as Array<{ field?: string; token?: string }> | undefined)?.filter(
      (tokenRow) => tokenRow && String(tokenRow.field ?? '').trim() !== '',
    )
    const additionalTokens =
      rows && rows.length > 0
        ? rows.map((tokenRow) => ({
            key: String(tokenRow.field ?? '').trim(),
            value: String(tokenRow.token ?? ''),
          }))
        : null
    base.nodePageParams = {
      idPage: pageId,
      accumulateUrlParams,
      additionalTokens,
    }
  } else if (editorNodeType === NODE_TYPES.externalUrl) {
    base.nodeExternalUrlParams = { url: String(editorParams.url ?? '') }
  } else if (editorNodeType === NODE_TYPES.condition) {
    base.nodeConditionParams = { idCondition: String(editorParams.conditionId ?? '') }
  } else if (editorNodeType === NODE_TYPES.jsCode || editorNodeType === NODE_TYPES.phpCode) {
    base.nodeCodeParams = { idCode: String(editorParams.snippetId ?? '') }
  } else if (editorNodeType === NODE_TYPES.visitorTag) {
    const visitorTagFields = editorParams as {
      tagId?: string
      tagName?: string
      tagKey?: string
      tagValue?: string
    }
    const tagId = String(visitorTagFields.tagId ?? visitorTagFields.tagKey ?? '').trim()
    const tagName = String(visitorTagFields.tagName ?? visitorTagFields.tagValue ?? '').trim()
    base.nodeVisitorTagParams = tagId !== '' ? { tags: { [tagId]: tagName } } : { tags: {} }
  }

  return base
}

function flowEdgeToV2(edge: FunnelFlowEdge, sourceNodeType: NodeTypeValue): Record<string, unknown> {
  const data = edge.data
  const base: Record<string, unknown> = {
    idConnection: edge.id,
    idFunnel: '', // filled by caller
    idSourceNode: edge.source,
    idTargetNode: edge.target,
    connectionRotatorParams: null,
    connectionPageParams: null,
    connectionCodeParams: null,
    connectionConditionParams: null,
    labelLocation: data?.labelLocation ?? 0.35,
  }

  if (!data) return base

  if (data.edgeType === 'weighted') {
    const w = (data.weight ?? 100) / 100
    base.connectionRotatorParams = { weight: w }
    return base
  }
  if (data.edgeType === 'action') {
    base.connectionPageParams = {
      onActionNumber: data.actionNumber ?? 1,
      isConversion: data.isConversion ?? false,
    }
    return base
  }
  if (data.edgeType === 'condition') {
    base.connectionConditionParams = {
      condition: data.branch === 'yes' ? 'ifYes' : 'ifNo',
    }
    return base
  }
  if (data.edgeType === 'code') {
    base.connectionCodeParams = { onDoneNumber: data.onDoneNumber ?? 1 }
    return base
  }

  // Fallback: rotator-style weight from root/rotator sources
  if (sourceNodeType === NODE_TYPES.root || sourceNodeType === NODE_TYPES.rotator) {
    base.connectionRotatorParams = { weight: 1 }
  } else {
    base.connectionPageParams = { onActionNumber: 1, isConversion: false }
  }
  return base
}

export function buildV2SavePayload(
  meta: FunnelMetaForSave,
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
  extras: FunnelPersistExtras,
): Record<string, unknown> {
  const idFunnel = meta.idFunnel
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  const v2Nodes = nodes.map((n) => flowNodeToV2(n, idFunnel))
  // Auto-distributed weights are computed in the editor; serialize the displayed values
  // so the backend always sees a sane sum across rotator/root siblings.
  const materializedEdges = materializeRotatorWeights(edges)
  const v2Connections = materializedEdges.map((edge) => {
    const sourceCanvasNode = nodeById.get(edge.source)
    const sourceNodeType = sourceCanvasNode?.data.nodeType ?? NODE_TYPES.root
    const serializedConnection = flowEdgeToV2(edge, sourceNodeType)
    serializedConnection.idFunnel = idFunnel
    return serializedConnection
  })

  const canvasWidth = meta.canvasWidth ?? extras.canvasWidth ?? 2000
  const canvasHeight = meta.canvasHeight ?? extras.canvasHeight ?? 1500

  return {
    idFunnel,
    idCampaign: meta.idCampaign,
    funnelName: meta.funnelName,
    defaultCostPerEntrance: meta.defaultCostPerEntrance,
    notes: meta.notes ?? '',
    canvasWidth,
    canvasHeight,
    acculumatedUrlParams: meta.acculumatedUrlParams.length ? meta.acculumatedUrlParams : extras.acculumatedUrlParams ?? [],
    customTokens: meta.customTokens.length ? meta.customTokens : extras.customTokens ?? [],
    incomingTrafficCostOverrides: meta.incomingTrafficCostOverrides.length
      ? meta.incomingTrafficCostOverrides
      : extras.incomingTrafficCostOverrides ?? [],
    postbackOverrides: meta.postbackOverrides.length ? meta.postbackOverrides : extras.postbackOverrides ?? [],
    nodes: v2Nodes,
    connections: v2Connections,
    isArchived: meta.isArchived ? 1 : 0,
  }
}
