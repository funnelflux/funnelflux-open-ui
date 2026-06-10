// Backward-compat shim:
// keep component imports stable while funnel graph rules live in `src/lib/funnel-graph/*`.

export {
  VISITOR_TAG_MAX_EXIT_CONNECTION_MESSAGE,
  visitorTagRejectedExtraExit,
  isValidConnection,
} from '@/lib/funnel-graph/connectionRules'

export {
  sourceHandleForConditionBranch,
  pickConditionBranchForNewConnection,
} from '@/lib/funnel-graph/conditionBranchPolicy'

export {
  coerceCodeEdgeRoles,
  coerceVisitorTagOutboundEdges,
  coerceJsPhpCodeOutboundHandles,
  coerceJsPhpInboundTargetHandles,
} from '@/lib/funnel-graph/graphHydrationCoercion'

export { getDefaultEdgeData } from '@/lib/funnel-graph/defaultEdgeData'
