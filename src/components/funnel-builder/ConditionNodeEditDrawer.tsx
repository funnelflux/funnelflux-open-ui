import { useCallback, useMemo } from 'react'
import { useToastApi } from '@/components/ui-kit'
import { ConditionEditor } from '@/components/funnel-builder/ConditionEditor'
import { useCondition } from '@/api/hooks'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import type { FunnelCondition } from '@/types/entities'
import type { ConditionNodeParams } from '@/types/funnel'
import { generateId } from '@/lib/id-generator'

interface ConditionNodeEditDrawerProps {
  nodeId: string
  open: boolean
  onClose: () => void
}

export function ConditionNodeEditDrawer({ nodeId, open, onClose }: ConditionNodeEditDrawerProps) {
  const toast = useToastApi()
  const node = useFunnelEditorStore((s) => s.nodes.find((n) => n.id === nodeId))
  const funnelId = useFunnelEditorStore((s) => s.meta.idFunnel)
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)
  const setPendingConditionDraft = useFunnelEditorStore((s) => s.setPendingConditionDraft)
  const pendingConditionDraft = useFunnelEditorStore((s) => s.pendingConditionDrafts[nodeId])

  const params = useMemo(() => (node?.data.params ?? {}) as ConditionNodeParams, [node?.data.params])
  const conditionId = params.conditionId ?? ''

  const conditionQuery = useCondition(conditionId, { staleTime: Infinity })

  const initialCondition = useMemo(() => {
    if (pendingConditionDraft?.condition) return pendingConditionDraft.condition
    if (!conditionId) return null
    return conditionQuery.data ?? null
  }, [conditionId, conditionQuery.data, pendingConditionDraft?.condition])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSave = useCallback(
    (condition: FunnelCondition) => {
      if (condition.restrictToFunnelId && !funnelId) {
        toast.error('Save your funnel first')
        return
      }

      const next: FunnelCondition = condition.restrictToFunnelId
        ? { ...condition, idCondition: condition.idCondition || generateId(), restrictToFunnelId: funnelId }
        : { ...condition, idCondition: condition.idCondition || generateId(), restrictToFunnelId: '' }

      setPendingConditionDraft(nodeId, { condition: next, original: conditionQuery.data, isCreate: !conditionId })
      updateNodeData(nodeId, {
        label: next.conditionName,
        params: {
          ...(params ?? {}),
          conditionId: next.idCondition,
          conditionName: next.conditionName,
        },
      })
      toast.success('Condition changes staged. Save the funnel to persist them.')
      onClose()
    },
    [conditionId, conditionQuery.data, funnelId, nodeId, onClose, params, setPendingConditionDraft, toast, updateNodeData],
  )

  if (!node) return null

  return (
    <ConditionEditor
      open={open}
      onClose={handleClose}
      mode={conditionId ? 'edit' : 'create'}
      condition={initialCondition}
      detailLoading={Boolean(
        conditionId && !pendingConditionDraft?.condition && !conditionQuery.data && conditionQuery.isFetching,
      )}
      onSave={handleSave}
      localScopeFunnelId={funnelId}
    />
  )
}

