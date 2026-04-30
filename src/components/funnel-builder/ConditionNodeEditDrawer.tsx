import { useCallback, useMemo } from 'react'
import { useToastApi } from '@/components/ui-kit'
import { ConditionEditor } from '@/components/funnel-builder/ConditionEditor'
import { useCondition, useSaveCondition } from '@/api/hooks'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import type { FunnelCondition } from '@/types/entities'
import type { ConditionNodeParams } from '@/types/funnel'
import { getErrorMessage } from '@/lib/utils'

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

  const params = useMemo(() => (node?.data.params ?? {}) as ConditionNodeParams, [node?.data.params])
  const conditionId = params.conditionId ?? ''

  const conditionQuery = useCondition(conditionId)
  const saveCondition = useSaveCondition()

  const initialCondition = useMemo(() => {
    if (!conditionId) return null
    return conditionQuery.data ?? null
  }, [conditionId, conditionQuery.data])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSave = useCallback(
    async (condition: FunnelCondition) => {
      try {
        if (condition.restrictToFunnelId && !funnelId) {
          toast.error('Save your funnel first')
          return
        }

        const next: FunnelCondition = condition.restrictToFunnelId
          ? { ...condition, restrictToFunnelId: funnelId }
          : { ...condition, restrictToFunnelId: '' }

        await saveCondition.mutateAsync(next)
        updateNodeData(nodeId, {
          label: next.conditionName,
          params: {
            ...(params ?? {}),
            conditionId: next.idCondition,
            conditionName: next.conditionName,
          },
        })
        toast.success('Condition saved')
        onClose()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    },
    [funnelId, nodeId, onClose, params, saveCondition, toast, updateNodeData],
  )

  if (!node) return null

  return (
    <ConditionEditor
      open={open}
      onClose={handleClose}
      condition={initialCondition}
      onSave={handleSave}
      localScopeFunnelId={funnelId}
    />
  )
}

