import { useState } from 'react'
import { Form, Input, InputNumber, Switch, FormModal, FormModalBody, FormModalFooter, FormModalHeader, Button } from '@/components/ui-kit'
import { Icon } from '@/components/ui-kit/icons'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import {
  computeDisplayedWeights,
  formatWeight,
  getSiblingWeightedEdges,
  maxAllowedWeight,
  WEIGHT_EPSILON,
} from '@/lib/rotatorWeights'
import { cn } from '@/lib/utils'
import {
  NODE_TYPE_LABELS,
  type FunnelFlowEdge,
  type NodeTypeValue,
  type WeightedEdgeData,
} from '@/types/funnel'

interface RotatorNodeEditModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

interface DraftRow {
  edgeId: string
  targetLabel: string
  weight: number
  locked: boolean
}

/**
 * Edit modal for rotator (and root) nodes — label + per-outgoing-connection weight editor.
 * The parent should pass `key={nodeId}` so this remounts when switching nodes.
 */
export function RotatorNodeEditModal({ nodeId, open, onClose }: RotatorNodeEditModalProps) {
  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)
  const updateEdgeData = useFunnelEditorStore((s) => s.updateEdgeData)

  const [label, setLabel] = useState(() => node?.data.label ?? '')

  // Seed rows once from the store snapshot at mount; user edits are local until Apply.
  const [rows, setRows] = useState<DraftRow[]>(() => {
    if (!node) return []
    const { nodes: storeNodes, edges: storeEdges } = useFunnelEditorStore.getState()
    const siblings = getSiblingWeightedEdges(storeEdges, node.id)
    const dist = computeDisplayedWeights(siblings)
    return siblings.map((e) => {
      const entry = dist.byEdgeId.get(e.id)
      const target = storeNodes.find((n) => n.id === e.target)
      const targetLabel =
        (target?.data.label && target.data.label.trim()) ||
        NODE_TYPE_LABELS[(target?.data.nodeType ?? 0) as NodeTypeValue] ||
        e.target
      return {
        edgeId: e.id,
        targetLabel,
        weight: entry?.weight ?? e.data.weight ?? 0,
        locked: Boolean(e.data.locked),
      }
    })
  })

  if (!node) return null

  const draftSiblings = rows.map((r) => ({
    id: r.edgeId,
    source: node.id,
    target: r.edgeId,
    type: 'weighted',
    data: { edgeType: 'weighted', weight: r.weight, locked: r.locked },
  })) as Array<FunnelFlowEdge & { data: WeightedEdgeData }>
  const draftDistribution = computeDisplayedWeights(draftSiblings)
  const total = draftDistribution.total
  const allLocked = draftDistribution.allLocked
  const hasError = allLocked && draftDistribution.errorDrift > WEIGHT_EPSILON

  function setRowWeight(edgeId: string, weight: number) {
    const max = maxAllowedWeight(draftSiblings, edgeId)
    const nextWeight = Math.max(0, Math.min(max, weight))
    setRows((prev) =>
      prev.map((r) => (r.edgeId === edgeId ? { ...r, weight: nextWeight, locked: true } : r)),
    )
  }

  function setRowLocked(edgeId: string, locked: boolean) {
    const displayed = draftDistribution.byEdgeId.get(edgeId)?.weight ?? 0
    setRows((prev) =>
      prev.map((r) => {
        if (r.edgeId !== edgeId) return r
        if (!locked) return { ...r, locked: false, weight: 0 }
        // Snap to currently displayed distribution when turning a row from auto -> locked.
        const seed = r.weight > 0 ? r.weight : displayed
        return { ...r, locked: true, weight: Math.round(seed) }
      }),
    )
  }

  function handleResetAll() {
    setRows((prev) => prev.map((r) => ({ ...r, locked: false, weight: 0 })))
  }

  function handleApply() {
    updateNodeData(node!.id, { label })
    for (const r of rows) {
      updateEdgeData(r.edgeId, { weight: r.locked ? r.weight : 0, locked: r.locked })
    }
    onClose()
  }

  return (
    <FormModal open={open} onCancel={onClose} destroyOnHidden>
      <FormModalHeader title="Edit Rotator" />
      <FormModalBody>
        <Form layout="vertical">
        <Form.Item label="Label">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Rotator"
          />
        </Form.Item>

        <Form.Item
          label="Weights"
          extra={
            rows.length === 0
              ? 'Connect this rotator to other nodes to assign weights.'
              : 'Locked rows keep their value; unlocked rows split the remainder evenly.'
          }
        >
          {rows.length > 0 && (
            <div className="min-w-0 rounded border bg-background">
              <div className="hidden grid-cols-[minmax(0,1fr)_120px_72px] items-center gap-2 border-b px-3 py-1.5 text-xs uppercase tracking-wide text-muted-foreground sm:grid">
                <span>Connection</span>
                <span className="text-right">Weight</span>
                <span className="text-right">Locked</span>
              </div>
              {rows.map((r) => {
                const displayed = draftDistribution.byEdgeId.get(r.edgeId)?.weight ?? r.weight
                return (
                  <div
                    key={r.edgeId}
                    className="grid min-w-0 grid-cols-1 gap-3 border-b px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_72px] sm:items-center sm:gap-2 sm:py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 text-xs text-muted-foreground sm:hidden">Connection</div>
                      <span className="block truncate text-sm" title={r.targetLabel}>
                        → {r.targetLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className="text-xs text-muted-foreground sm:hidden">Weight</span>
                      <div className="flex items-center gap-1">
                        <InputNumber
                          size="small"
                          min={0}
                          max={100}
                          step={1}
                          value={Number(formatWeight(displayed))}
                          disabled={!r.locked}
                          onChange={(v) =>
                            setRowWeight(r.edgeId, typeof v === 'number' ? v : 0)
                          }
                          className="w-20"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className="text-xs text-muted-foreground sm:hidden">Locked</span>
                      <Switch
                        size="small"
                        checked={r.locked}
                        onChange={(checked) => setRowLocked(r.edgeId, checked)}
                      />
                    </div>
                  </div>
                )
              })}
              <div
                className={cn(
                  'flex flex-col gap-2 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between',
                  hasError ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                <span>
                  Total: <span className="font-medium">{formatWeight(total)}%</span>
                  {hasError && ' — must equal 100%'}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-xs hover:bg-muted dark:hover:bg-zinc-800"
                  onClick={handleResetAll}
                >
                  <Icon name="rotate-ccw" size="sm" />
                  Reset all to auto
                </button>
              </div>
            </div>
          )}
        </Form.Item>
        </Form>
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="primary" htmlType="button" onClick={handleApply}>
          Apply
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
