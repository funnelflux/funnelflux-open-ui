import { NODE_TYPES, type NodeTypeValue } from '@/types/funnel'

export const FUNNEL_NODE_TYPE_BY_API_NAME: Record<string, NodeTypeValue> = {
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

export const FUNNEL_NODE_API_NAME_BY_TYPE: Record<number, string> = {
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
