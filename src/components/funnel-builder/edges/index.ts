import type { EdgeTypes } from '@xyflow/react'
import { WeightedEdge } from './WeightedEdge'
import { ActionEdge } from './ActionEdge'
import { ConditionEdge } from './ConditionEdge'
import { CodeEdge } from './CodeEdge'

export const edgeTypes: EdgeTypes = {
  weighted: WeightedEdge,
  action: ActionEdge,
  condition: ConditionEdge,
  code: CodeEdge,
}
