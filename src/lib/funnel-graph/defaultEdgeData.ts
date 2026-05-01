import {
  NODE_TYPES,
  type ActionEdgeData,
  type CodeEdgeData,
  type ConditionEdgeData,
  type FunnelEdgeData,
  type FunnelFlowEdge,
  type FunnelFlowNode,
  type WeightedEdgeData,
} from '@/types/funnel'
import {
  CODE_NODE_MAX_ON_DONE_EXITS,
  parseCodeExitHandleId,
} from '@/lib/codeNodeExits'
import {
  conditionBranchFromSourceHandle,
  pickConditionBranchForNewConnection,
} from '@/lib/funnel-graph/conditionBranchPolicy'
import {
  clampOnDoneNumber,
  firstFreeOnDoneSlot,
  usedOnDoneSlotsForJsPhpSource,
} from '@/lib/funnel-graph/codeEdgeSlots'

export function getDefaultEdgeData(
  sourceNode: FunnelFlowNode,
  sourceHandle?: string | null,
  edges?: FunnelFlowEdge[],
  opts?: { conditionBranch?: 'yes' | 'no' },
): FunnelEdgeData {
  const nodeType = sourceNode.data.nodeType

  switch (nodeType) {
    case NODE_TYPES.root:
    case NODE_TYPES.rotator: {
      // New rotator edges default to unlocked so they auto-share with siblings (e.g. 50/50, 33/33/33).
      return { edgeType: 'weighted', weight: 0, locked: false } satisfies WeightedEdgeData
    }

    case NODE_TYPES.lander:
    case NODE_TYPES.offer: {
      // Determine next action number by counting existing action edges from this node.
      const existingActions = edges
        ? edges.filter(
            (e) =>
              e.source === sourceNode.id &&
              e.data?.edgeType === 'action',
          ).length
        : 0
      return {
        edgeType: 'action',
        actionNumber: existingActions + 1,
      } satisfies ActionEdgeData
    }

    case NODE_TYPES.condition: {
      const branch =
        opts?.conditionBranch ??
        (edges ? pickConditionBranchForNewConnection(sourceNode.id, edges) : null) ??
        conditionBranchFromSourceHandle(sourceHandle)
      return { edgeType: 'condition', branch } satisfies ConditionEdgeData
    }

    case NODE_TYPES.jsCode:
    case NODE_TYPES.phpCode: {
      const fromGrab = parseCodeExitHandleId(sourceHandle)
      const used = edges ? usedOnDoneSlotsForJsPhpSource(sourceNode.id, edges) : new Set<number>()
      const free = edges ? firstFreeOnDoneSlot(sourceNode.id, edges) : 1
      const n =
        fromGrab != null && !used.has(fromGrab)
          ? fromGrab
          : (free ?? CODE_NODE_MAX_ON_DONE_EXITS)
      return {
        edgeType: 'code',
        codeEdgeRole: 'snippet',
        onDoneNumber: clampOnDoneNumber(n),
      } satisfies CodeEdgeData
    }

    case NODE_TYPES.visitorTag:
      return { edgeType: 'code', codeEdgeRole: 'visitorTag', onDoneNumber: 1 } satisfies CodeEdgeData

    default: {
      return { edgeType: 'weighted', weight: 0, locked: false } satisfies WeightedEdgeData
    }
  }
}
