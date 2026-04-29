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

export type FunnelMetaForSave = FunnelEditorMeta

const STRING_TO_TYPE: Record<string, NodeTypeValue> = {
  root: NODE_TYPES.root,
  rotator: NODE_TYPES.rotator,
  lander: NODE_TYPES.lander,
  offer: NODE_TYPES.offer,
  externalUrl: NODE_TYPES.externalUrl,
  condition: NODE_TYPES.condition,
  jsCode: NODE_TYPES.jsCode,
  phpCode: NODE_TYPES.phpCode,
  visitorTag: NODE_TYPES.visitorTag,
}

const TYPE_TO_STRING: Record<number, string> = {
  [NODE_TYPES.root]: 'root',
  [NODE_TYPES.rotator]: 'rotator',
  [NODE_TYPES.lander]: 'lander',
  [NODE_TYPES.offer]: 'offer',
  [NODE_TYPES.externalUrl]: 'externalUrl',
  [NODE_TYPES.condition]: 'condition',
  [NODE_TYPES.jsCode]: 'jsCode',
  [NODE_TYPES.phpCode]: 'phpCode',
  [NODE_TYPES.visitorTag]: 'visitorTag',
}

function posToPercent(pos: number): number {
  if (typeof pos !== 'number' || Number.isNaN(pos)) return 0
  // API uses 0–1 fractions; legacy editor uses 0–100
  if (pos >= 0 && pos <= 1) return pos * 100
  return pos
}

function isV2Node(n: Record<string, unknown>): boolean {
  return typeof n.nodeType === 'string'
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

function normalizeNode(node: Record<string, unknown>): ApiFunnelNode {
  if (!isV2Node(node) && node.percentPosX !== undefined && node.nodeParams !== undefined) {
    return {
      idNode: String(node.idNode),
      idFunnel: String(node.idFunnel),
      nodeName: String(node.nodeName ?? ''),
      nodeType: Number(node.nodeType) as NodeTypeValue,
      nodeParams: (node.nodeParams ?? {}) as Record<string, unknown>,
      percentPosX: Number(node.percentPosX),
      percentPosY: Number(node.percentPosY),
      isArchived: Boolean(node.isArchived),
    }
  }

  const ntKey = String(node.nodeType ?? 'root')
  const nodeType = STRING_TO_TYPE[ntKey] ?? NODE_TYPES.root
  const px = posToPercent(Number(node.posX))
  const py = posToPercent(Number(node.posY))

  const nodeParams = buildNodeParamsFromV2(nodeType, node)

  return {
    idNode: String(node.idNode),
    idFunnel: String(node.idFunnel),
    nodeName: String(node.nodeName ?? ''),
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
          .map((t) => ({
            field: String(t.key ?? ''),
            token: String(t.value ?? ''),
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
    return cond?.idCondition
      ? { conditionId: String(cond.idCondition), conditionName: String(node.nodeName ?? '') }
      : {}
  }
  if (nodeType === NODE_TYPES.jsCode || nodeType === NODE_TYPES.phpCode) {
    const code = node.nodeCodeParams as { idCode?: string } | null | undefined
    return code?.idCode ? { snippetId: String(code.idCode), snippetName: String(node.nodeName ?? '') } : {}
  }
  if (nodeType === NODE_TYPES.visitorTag) {
    const vt = node.nodeVisitorTagParams as { tags?: Record<string, string> | Array<{ key: string; value: string }> } | null | undefined
    if (vt?.tags) {
      if (Array.isArray(vt.tags)) {
        const first = vt.tags[0]
        return first ? { tagKey: String(first.key ?? ''), tagValue: String(first.value ?? '') } : {}
      }
      const entries = Object.entries(vt.tags)
      if (entries.length > 0) {
        return { tagKey: entries[0][0], tagValue: String(entries[0][1]) }
      }
    }
    return {}
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
    const p = conn.connectionPageParams as { onActionNumber?: number; isConversion?: boolean }
    return {
      ...base,
      elementData: {
        actionNumber: p.onActionNumber ?? 1,
        isConversion: p.isConversion ?? false,
      },
    }
  }
  if (conn.connectionCodeParams != null) {
    const p = conn.connectionCodeParams as { onDoneNumber?: number }
    return {
      ...base,
      elementData: { onDoneNumber: p.onDoneNumber ?? 1, edgeType: 'code' },
    }
  }
  if (conn.connectionConditionParams != null) {
    const p = conn.connectionConditionParams as { condition?: string }
    const branch = p.condition === 'ifYes' || p.condition === 'IF_YES' ? 'yes' : 'no'
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
  const nt = node.data.nodeType
  const typeStr = TYPE_TO_STRING[nt] ?? 'root'
  const params = node.data.params as Record<string, unknown>

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

  if (nt === NODE_TYPES.root || nt === NODE_TYPES.rotator) {
    base.nodeRotatorParams = { rotatorType: 'random' }
  } else if (nt === NODE_TYPES.lander || nt === NODE_TYPES.offer) {
    const pageId = (params.pageId as string) ?? '0'
    const accumulateUrlParams = Boolean(params.accumulateUrlParams)
    const rows = (params.additionalTokens as Array<{ field?: string; token?: string }> | undefined)?.filter(
      (r) => r && String(r.field ?? '').trim() !== '',
    )
    const additionalTokens =
      rows && rows.length > 0
        ? rows.map((r) => ({
            key: String(r.field ?? '').trim(),
            value: String(r.token ?? ''),
          }))
        : null
    base.nodePageParams = {
      idPage: pageId,
      accumulateUrlParams,
      additionalTokens,
    }
  } else if (nt === NODE_TYPES.externalUrl) {
    base.nodeExternalUrlParams = { url: String(params.url ?? '') }
  } else if (nt === NODE_TYPES.condition) {
    base.nodeConditionParams = { idCondition: String(params.conditionId ?? '') }
  } else if (nt === NODE_TYPES.jsCode || nt === NODE_TYPES.phpCode) {
    base.nodeCodeParams = { idCode: String(params.snippetId ?? '') }
  } else if (nt === NODE_TYPES.visitorTag) {
    const tagKey = String(params.tagKey ?? '')
    const tagValue = String(params.tagValue ?? '')
    base.nodeVisitorTagParams = tagKey ? { tags: { [tagKey]: tagValue } } : { tags: {} }
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
  const v2Connections = materializedEdges.map((e) => {
    const src = nodeById.get(e.source)
    const st = src?.data.nodeType ?? NODE_TYPES.root
    const c = flowEdgeToV2(e, st)
    c.idFunnel = idFunnel
    return c
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
