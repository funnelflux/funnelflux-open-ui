/**
 * Pure funnel graph validation: invariants for editor state and save-time checks.
 * UI connection rules alone cannot prevent invalid graphs from hydration, imports, or store paths.
 */
import { CODE_NODE_MAX_ON_DONE_EXITS } from '@/lib/codeNodeExits'
import { clampOnDoneNumber } from '@/lib/funnel-graph/codeEdgeSlots'
import type { ConditionEdgeData, FunnelFlowEdge, FunnelFlowNode } from '@/types/funnel'
import {
  NODE_TYPES,
  normalizeVisitorTagParams,
  type CodeEdgeData,
  type NodeParams,
  type NodeTypeValue,
} from '@/types/funnel'

export type GraphIssueSeverity = 'error' | 'warning'

export type GraphIssueCode =
  | 'ROOT_COUNT'
  | 'UNKNOWN_NODE_TYPE'
  | 'DUPLICATE_NODE_ID'
  | 'DUPLICATE_EDGE_ID'
  | 'DANGLING_EDGE'
  | 'SELF_EDGE'
  | 'ROOT_TARGET'
  | 'INVALID_EDGE_DUPLICATE'
  | 'CONDITION_BRANCH_LIMIT'
  | 'VISITOR_TAG_EXIT_LIMIT'
  | 'CODE_EXIT_SLOT'
  | 'PAGE_TO_CODE_EDGE'
  | 'EDGE_TYPE_SOURCE_MISMATCH'
  | 'PARAM_LANDER_OFFER_PAGE'
  | 'PARAM_EXTERNAL_URL'
  | 'PARAM_CONDITION'
  | 'PARAM_CODE_SNIPPET'
  | 'PARAM_VISITOR_TAG'

export interface GraphIssue {
  severity: GraphIssueSeverity
  code: GraphIssueCode
  message: string
  nodeId?: string
  edgeId?: string
}

export interface ValidateFunnelGraphOptions {
  /** When true, require node params needed for a successful API save. */
  forSave?: boolean
}

export interface ValidateFunnelGraphResult {
  errors: GraphIssue[]
  warnings: GraphIssue[]
}

const KNOWN_NODE_TYPES = new Set<NodeTypeValue>(Object.values(NODE_TYPES) as NodeTypeValue[])

function edgeTypeMatchesSource(sourceType: NodeTypeValue, edge: FunnelFlowEdge): boolean {
  const t = edge.data?.edgeType
  if (!t) return false
  switch (sourceType) {
    case NODE_TYPES.root:
    case NODE_TYPES.rotator:
      return t === 'weighted'
    case NODE_TYPES.lander:
    case NODE_TYPES.offer:
      return t === 'action'
    case NODE_TYPES.externalUrl:
      return t === 'weighted' || t === 'action'
    case NODE_TYPES.condition:
      return t === 'condition'
    case NODE_TYPES.jsCode:
    case NODE_TYPES.phpCode:
      return t === 'code'
    case NODE_TYPES.visitorTag:
      return t === 'code'
    default:
      return false
  }
}

function validateParamsForSave(node: FunnelFlowNode, errors: GraphIssue[]): void {
  const { nodeType, params } = node.data
  const p = params as NodeParams & Record<string, unknown>

  switch (nodeType) {
    case NODE_TYPES.lander:
    case NODE_TYPES.offer: {
      const pageId = typeof p.pageId === 'string' ? p.pageId.trim() : ''
      if (pageId === '' || pageId === '0') {
        errors.push({
          severity: 'error',
          code: 'PARAM_LANDER_OFFER_PAGE',
          message: `${node.data.label || node.id}: lander/offer nodes need a page before save.`,
          nodeId: node.id,
        })
      }
      break
    }
    case NODE_TYPES.externalUrl: {
      const url = typeof p.url === 'string' ? p.url.trim() : ''
      if (url === '') {
        errors.push({
          severity: 'error',
          code: 'PARAM_EXTERNAL_URL',
          message: `${node.data.label || node.id}: external URL node needs a URL before save.`,
          nodeId: node.id,
        })
      }
      break
    }
    case NODE_TYPES.condition: {
      const conditionId = typeof p.conditionId === 'string' ? p.conditionId.trim() : ''
      const rules = Array.isArray(p.rules) ? p.rules : []
      if (conditionId === '' && rules.length === 0) {
        errors.push({
          severity: 'error',
          code: 'PARAM_CONDITION',
          message: `${node.data.label || node.id}: condition node needs a saved condition or inline rules before save.`,
          nodeId: node.id,
        })
      }
      break
    }
    case NODE_TYPES.jsCode:
    case NODE_TYPES.phpCode: {
      const snippetId = typeof p.snippetId === 'string' ? p.snippetId.trim() : ''
      const code = typeof p.code === 'string' ? p.code.trim() : ''
      if (snippetId === '' && code === '') {
        errors.push({
          severity: 'error',
          code: 'PARAM_CODE_SNIPPET',
          message: `${node.data.label || node.id}: code node needs a snippet or inline code before save.`,
          nodeId: node.id,
        })
      }
      break
    }
    case NODE_TYPES.visitorTag: {
      const { tagId } = normalizeVisitorTagParams(p)
      if (tagId.trim() === '') {
        errors.push({
          severity: 'error',
          code: 'PARAM_VISITOR_TAG',
          message: `${node.data.label || node.id}: visitor tag node needs a tag before save.`,
          nodeId: node.id,
        })
      }
      break
    }
    default:
      break
  }
}

export function validateFunnelGraph(
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
  options: ValidateFunnelGraphOptions = {},
): ValidateFunnelGraphResult {
  const errors: GraphIssue[] = []
  const warnings: GraphIssue[] = []
  const forSave = options.forSave === true

  const nodeById = new Map<string, FunnelFlowNode>()
  const seenNodeIds = new Set<string>()
  for (const node of nodes) {
    if (seenNodeIds.has(node.id)) {
      errors.push({
        severity: 'error',
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node id: ${node.id}`,
        nodeId: node.id,
      })
    }
    seenNodeIds.add(node.id)
    nodeById.set(node.id, node)
    if (!KNOWN_NODE_TYPES.has(node.data.nodeType)) {
      errors.push({
        severity: 'error',
        code: 'UNKNOWN_NODE_TYPE',
        message: `Node ${node.id} has unknown nodeType ${String(node.data.nodeType)}`,
        nodeId: node.id,
      })
    }
  }

  const rootNodes = nodes.filter((n) => n.data.nodeType === NODE_TYPES.root)
  if (rootNodes.length !== 1) {
    errors.push({
      severity: 'error',
      code: 'ROOT_COUNT',
      message: `Expected exactly one entrance (root) node, found ${rootNodes.length}.`,
    })
  } else {
    const root = rootNodes[0]
    if (root.data.isEntrance !== true) {
      warnings.push({
        severity: 'warning',
        code: 'ROOT_COUNT',
        message: 'Entrance node should be marked isEntrance.',
        nodeId: root.id,
      })
    }
  }

  const seenEdgeIds = new Set<string>()
  for (const edge of edges) {
    if (seenEdgeIds.has(edge.id)) {
      errors.push({
        severity: 'error',
        code: 'DUPLICATE_EDGE_ID',
        message: `Duplicate edge id: ${edge.id}`,
        edgeId: edge.id,
      })
    }
    seenEdgeIds.add(edge.id)
    if (edge.source === edge.target) {
      errors.push({
        severity: 'error',
        code: 'SELF_EDGE',
        message: `Self-edge not allowed (${edge.id}).`,
        edgeId: edge.id,
      })
    }
    const sourceNode = nodeById.get(edge.source)
    const targetNode = nodeById.get(edge.target)
    if (!sourceNode || !targetNode) {
      errors.push({
        severity: 'error',
        code: 'DANGLING_EDGE',
        message: `Edge ${edge.id} references missing node(s).`,
        edgeId: edge.id,
      })
      continue
    }
    if (targetNode.data.nodeType === NODE_TYPES.root) {
      errors.push({
        severity: 'error',
        code: 'ROOT_TARGET',
        message: `Edge ${edge.id}: cannot connect to the entrance node.`,
        edgeId: edge.id,
        nodeId: targetNode.id,
      })
    }

    const st = sourceNode.data.nodeType
    const tt = targetNode.data.nodeType
    if (
      (st === NODE_TYPES.lander || st === NODE_TYPES.offer || st === NODE_TYPES.externalUrl) &&
      (tt === NODE_TYPES.jsCode || tt === NODE_TYPES.phpCode)
    ) {
      errors.push({
        severity: 'error',
        code: 'PAGE_TO_CODE_EDGE',
        message: `Edge ${edge.id}: page nodes cannot link directly to code nodes.`,
        edgeId: edge.id,
      })
    }

    if (!edgeTypeMatchesSource(st, edge)) {
      errors.push({
        severity: 'error',
        code: 'EDGE_TYPE_SOURCE_MISMATCH',
        message: `Edge ${edge.id}: edge type does not match source node type.`,
        edgeId: edge.id,
        nodeId: sourceNode.id,
      })
    }
  }

  const dupKeys = new Set<string>()
  for (const edge of edges) {
    const sh = edge.sourceHandle ?? ''
    const key = `${edge.source}|${edge.target}|${sh}`
    if (dupKeys.has(key)) {
      errors.push({
        severity: 'error',
        code: 'INVALID_EDGE_DUPLICATE',
        message: `Duplicate connection (${edge.source} → ${edge.target}, handle ${sh || 'default'}).`,
        edgeId: edge.id,
      })
    }
    dupKeys.add(key)
  }

  const conditionNodes = nodes.filter((n) => n.data.nodeType === NODE_TYPES.condition)
  for (const condNode of conditionNodes) {
    let yes = 0
    let no = 0
    for (const e of edges) {
      if (e.source !== condNode.id) continue
      if (e.data?.edgeType !== 'condition') continue
      const branch = (e.data as ConditionEdgeData).branch
      if (branch === 'yes') yes++
      if (branch === 'no') no++
    }
    if (yes > 1 || no > 1) {
      errors.push({
        severity: 'error',
        code: 'CONDITION_BRANCH_LIMIT',
        message: `Condition node ${condNode.id}: at most one YES and one NO branch allowed.`,
        nodeId: condNode.id,
      })
    }
  }

  const visitorTags = nodes.filter((n) => n.data.nodeType === NODE_TYPES.visitorTag)
  for (const vt of visitorTags) {
    const out = edges.filter((e) => e.source === vt.id)
    if (out.length > 1) {
      errors.push({
        severity: 'error',
        code: 'VISITOR_TAG_EXIT_LIMIT',
        message: `Visitor tag node ${vt.id}: at most one exit connection.`,
        nodeId: vt.id,
      })
    }
  }

  const codeSources = nodes.filter(
    (n) => n.data.nodeType === NODE_TYPES.jsCode || n.data.nodeType === NODE_TYPES.phpCode,
  )
  for (const cn of codeSources) {
    const outbound = edges.filter((e) => e.source === cn.id && e.data?.edgeType === 'code')
    if (outbound.length > CODE_NODE_MAX_ON_DONE_EXITS) {
      errors.push({
        severity: 'error',
        code: 'CODE_EXIT_SLOT',
        message: `Code node ${cn.id}: at most ${String(CODE_NODE_MAX_ON_DONE_EXITS)} onDone exits.`,
        nodeId: cn.id,
      })
    }
    const slots = new Set<number>()
    for (const e of outbound) {
      const n = clampOnDoneNumber((e.data as CodeEdgeData).onDoneNumber)
      if (slots.has(n)) {
        errors.push({
          severity: 'error',
          code: 'CODE_EXIT_SLOT',
          message: `Code node ${cn.id}: duplicate onDone slot ${n}.`,
          nodeId: cn.id,
          edgeId: e.id,
        })
      }
      slots.add(n)
      if (n < 1 || n > CODE_NODE_MAX_ON_DONE_EXITS) {
        errors.push({
          severity: 'error',
          code: 'CODE_EXIT_SLOT',
          message: `Code node ${cn.id}: onDoneNumber ${n} out of range.`,
          nodeId: cn.id,
          edgeId: e.id,
        })
      }
    }
  }

  if (forSave) {
    for (const node of nodes) {
      validateParamsForSave(node, errors)
    }
  }

  return { errors, warnings }
}
