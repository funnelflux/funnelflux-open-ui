import type { NodeTypes } from '@xyflow/react'
import { RootNode } from './RootNode'
import { RotatorNode } from './RotatorNode'
import { LanderNode } from './LanderNode'
import { OfferNode } from './OfferNode'
import { ExternalUrlNode } from './ExternalUrlNode'
import { ConditionNode } from './ConditionNode'
import { JsCodeNode } from './JsCodeNode'
import { PhpCodeNode } from './PhpCodeNode'
import { VisitorTagNode } from './VisitorTagNode'

export const nodeTypes: NodeTypes = {
  root: RootNode,
  rotator: RotatorNode,
  lander: LanderNode,
  offer: OfferNode,
  externalUrl: ExternalUrlNode,
  condition: ConditionNode,
  jsCode: JsCodeNode,
  phpCode: PhpCodeNode,
  visitorTag: VisitorTagNode,
}

export {
  RootNode,
  RotatorNode,
  LanderNode,
  OfferNode,
  ExternalUrlNode,
  ConditionNode,
  JsCodeNode,
  PhpCodeNode,
  VisitorTagNode,
}
