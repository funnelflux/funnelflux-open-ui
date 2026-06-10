import type { FunnelNode } from '@/types/entities'

/** Node types that support direct (no-redirect) tracking with a page URL. */
export const DIRECT_TRACKING_NODE_TYPES = ['lander', 'offer', 'externalUrl'] as const

export type DirectTrackingNodeType = (typeof DIRECT_TRACKING_NODE_TYPES)[number]

export function isDirectTrackingNodeType(nodeType: string): nodeType is DirectTrackingNodeType {
  return (DIRECT_TRACKING_NODE_TYPES as readonly string[]).includes(nodeType)
}

export function funnelNodeSupportsDirectTracking(node: FunnelNode | undefined): boolean {
  return node != null && isDirectTrackingNodeType(node.nodeType)
}
