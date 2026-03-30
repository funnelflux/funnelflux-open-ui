import type { Node, Edge } from '@xyflow/react'

// ── Node Types ──────────────────────────────────────────────────────────────

export const NODE_TYPES = {
  root: 0,
  rotator: 1,
  lander: 2,
  offer: 3,
  externalUrl: 4,
  condition: 5,
  jsCode: 6,
  phpCode: 7,
  visitorTag: 8,
} as const

export type NodeTypeValue = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]
export type NodeTypeKey = keyof typeof NODE_TYPES

export const NODE_TYPE_LABELS: Record<NodeTypeValue, string> = {
  [NODE_TYPES.root]: 'Entrance',
  [NODE_TYPES.rotator]: 'Rotator',
  [NODE_TYPES.lander]: 'Lander',
  [NODE_TYPES.offer]: 'Offer',
  [NODE_TYPES.externalUrl]: 'External URL',
  [NODE_TYPES.condition]: 'Condition',
  [NODE_TYPES.jsCode]: 'JavaScript',
  [NODE_TYPES.phpCode]: 'PHP Code',
  [NODE_TYPES.visitorTag]: 'Visitor Tag',
}

// ── Node Params (per node type) ─────────────────────────────────────────────

export interface RootNodeParams {
  trafficSourceId?: string
  trafficSourceName?: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RotatorNodeParams {
  // Rotator has no unique params — weights are on connections
}

export interface LanderNodeParams {
  pageId: string
  pageName?: string
  redirectType?: string
}

export interface OfferNodeParams {
  pageId: string
  pageName?: string
  redirectType?: string
}

export interface ExternalUrlNodeParams {
  url: string
  redirectType?: string
}

export interface ConditionNodeParams {
  conditionId?: string
  conditionName?: string
  // Inline conditions for funnel-scoped rules
  rules?: ConditionRule[]
  logicOperator?: 'AND' | 'OR'
}

export interface JsCodeNodeParams {
  snippetId?: string
  snippetName?: string
  code?: string
}

export interface PhpCodeNodeParams {
  code?: string
}

export interface VisitorTagNodeParams {
  tagKey: string
  tagValue: string
}

export type NodeParams =
  | RootNodeParams
  | RotatorNodeParams
  | LanderNodeParams
  | OfferNodeParams
  | ExternalUrlNodeParams
  | ConditionNodeParams
  | JsCodeNodeParams
  | PhpCodeNodeParams
  | VisitorTagNodeParams

// ── Condition System ────────────────────────────────────────────────────────

export const CONDITION_FIELDS = [
  'country',
  'region',
  'city',
  'language',
  'isp',
  'ip',
  'deviceType',
  'os',
  'osVersion',
  'browser',
  'browserVersion',
  'brand',
  'model',
  'connectionType',
  'referrer',
  'referrerDomain',
  'userAgent',
  'dayOfWeek',
  'hourOfDay',
  'visitorTag',
  'queryParam',
  'customField',
] as const

export type ConditionField = (typeof CONDITION_FIELDS)[number]

export const CONDITION_OPERATORS = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'in',
  'notIn',
  'greaterThan',
  'lessThan',
  'between',
  'matches',
  'exists',
  'notExists',
] as const

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

export interface ConditionRule {
  field: ConditionField
  operator: ConditionOperator
  value: string | string[]
  extraKey?: string // For queryParam, visitorTag, customField
}

export interface ConditionBlock {
  logicOperator: 'AND' | 'OR'
  rules: ConditionRule[]
}

export interface Condition {
  idCondition: string
  conditionName: string
  scope: 'global' | 'funnel'
  blocks: ConditionBlock[]
  blockLogicOperator: 'AND' | 'OR'
}

// ── Connection / Edge Types ─────────────────────────────────────────────────

export const EDGE_TYPES = {
  weighted: 'weighted',
  action: 'action',
  condition: 'condition',
  code: 'code',
} as const

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES]

export interface WeightedEdgeData {
  edgeType: 'weighted'
  weight: number // 0–100
  [key: string]: unknown
}

export interface ActionEdgeData {
  edgeType: 'action'
  actionNumber: number // 1-based
  [key: string]: unknown
}

export interface ConditionEdgeData {
  edgeType: 'condition'
  branch: 'yes' | 'no'
  [key: string]: unknown
}

export interface CodeEdgeData {
  edgeType: 'code'
  [key: string]: unknown
}

export type FunnelEdgeData = WeightedEdgeData | ActionEdgeData | ConditionEdgeData | CodeEdgeData

// ── React Flow Node/Edge ────────────────────────────────────────────────────

export interface FunnelNodeData {
  nodeType: NodeTypeValue
  label: string
  params: NodeParams
  isEntrance?: boolean
  [key: string]: unknown
}

export type FunnelFlowNode = Node<FunnelNodeData>
export type FunnelFlowEdge = Edge<FunnelEdgeData>

// ── API ↔ React Flow Conversion ─────────────────────────────────────────────

export interface ApiFunnelNode {
  idNode: string
  idFunnel: string
  nodeType: number
  nodeName: string
  nodeParams: Record<string, unknown>
  percentPosX: number
  percentPosY: number
  isArchived?: boolean
}

export interface ApiFunnelConnection {
  idConnection: string
  idFunnel: string
  idSourceNode: string
  idTargetNode: string
  sourceHandle?: string
  targetHandle?: string
  weight?: number
  elementData?: Record<string, unknown>
}

export interface ApiFunnel {
  idFunnel: string
  idCampaign: string
  funnelName: string
  defaultCostPerEntrance: number
  defaultRedirectUrl?: string
  defaultOverflowUrl?: string
  deduplicateByIp?: boolean
  deduplicateWindowHours?: number
  nodes: ApiFunnelNode[]
  connections: ApiFunnelConnection[]
  isArchived: boolean
}

// ── Code Snippet ────────────────────────────────────────────────────────────

export interface CodeSnippet {
  idSnippet: string
  snippetName: string
  snippetType: 'javascript' | 'php'
  code: string
}
