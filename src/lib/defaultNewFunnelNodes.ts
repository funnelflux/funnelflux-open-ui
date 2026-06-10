import { generateId } from '@/lib/id-generator'
import { percentToPixel } from '@/lib/funnelCoords'
import { NODE_TYPES, NODE_TYPE_LABELS, type FunnelFlowNode } from '@/types/funnel'
import type { Funnel, FunnelNode } from '@/types/entities'

/** Canvas position for the default entrance node on new funnels (percent 0–100). */
export const DEFAULT_ENTRANCE_PERCENT = { x: 12, y: 20 } as const

/**
 * Wire shape for POST /data/campaign/funnel/save/ when creating a funnel with one root (traffic) node.
 */
export function createDefaultEntranceApiNode(idFunnel: string, idNode: string): FunnelNode {
  return {
    idNode,
    idFunnel,
    nodeName: NODE_TYPE_LABELS[NODE_TYPES.root],
    nodeType: 'root',
    nodeRotatorParams: { rotatorType: 'random' },
    posX: DEFAULT_ENTRANCE_PERCENT.x / 100,
    posY: DEFAULT_ENTRANCE_PERCENT.y / 100,
    isArchived: false,
  }
}

/** Default canvas size for new funnels (matches funnel editor save defaults). */
export const DEFAULT_NEW_FUNNEL_CANVAS = { width: 2000, height: 1500 } as const

/**
 * Payload for POST /data/campaign/funnel/save/ when creating a funnel from the campaigns UI.
 */
export function buildMinimalNewFunnelPayload(idCampaign: string, funnelName: string): Funnel {
  const idFunnel = generateId()
  const idNode = generateId()
  return {
    idFunnel,
    idCampaign,
    funnelName,
    defaultCostPerEntrance: '0',
    canvasWidth: DEFAULT_NEW_FUNNEL_CANVAS.width,
    canvasHeight: DEFAULT_NEW_FUNNEL_CANVAS.height,
    acculumatedUrlParams: [],
    customTokens: [],
    incomingTrafficCostOverrides: [],
    postbackOverrides: [],
    nodes: [createDefaultEntranceApiNode(idFunnel, idNode)],
    connections: [],
    isArchived: false,
  }
}

/** React Flow node for the funnel editor initial graph. */
export function createDefaultEntranceFlowNode(idNode: string): FunnelFlowNode {
  const pos = percentToPixel(DEFAULT_ENTRANCE_PERCENT.x, DEFAULT_ENTRANCE_PERCENT.y)
  return {
    id: idNode,
    type: 'root',
    position: pos,
    data: {
      nodeType: NODE_TYPES.root,
      label: NODE_TYPE_LABELS[NODE_TYPES.root],
      params: {},
      isEntrance: true,
    },
  }
}
