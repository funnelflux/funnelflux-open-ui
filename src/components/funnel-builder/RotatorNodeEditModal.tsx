import { useState } from 'react'
import { Form, Input, InputNumber, Modal, Switch } from '@/components/ui-kit'
import { Icon } from '@/components/ui-kit/icons'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import {
  computeDisplayedWeights,
  formatWeight,
  getSiblingWeightedEdges,
  WEIGHT_EPSILON,
} from '@/lib/rotatorWeights'
import { cn } from '@/lib/utils'
import { NODE_TYPE_LABELS, type NodeTypeValue } from '@/types/funnel'

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

  const lockedSum = rows
    .filter((r) => r.locked)
    .reduce((acc, r) => acc + Math.max(0, Math.min(100, r.weight)), 0)
  const unlockedCount = rows.filter((r) => !r.locked).length
  const remaining = Math.max(0, 100 - lockedSum)
  const share = unlockedCount > 0 ? remaining / unlockedCount : 0
  const total = rows.reduce(
    (acc, r) => acc + (r.locked ? Math.max(0, Math.min(100, r.weight)) : share),
    0,
  )
  const allLocked = rows.length > 0 && unlockedCount === 0
  const hasError = allLocked && Math.abs(100 - total) > WEIGHT_EPSILON

  function setRowWeight(edgeId: string, weight: number) {
    setRows((prev) =>
      prev.map((r) => (r.edgeId === edgeId ? { ...r, weight, locked: true } : r)),
    )
  }

  function setRowLocked(edgeId: string, locked: boolean) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.edgeId !== edgeId) return r
        if (!locked) return { ...r, locked: false, weight: 0 }
        // When locking, snap to current displayed share so the number doesn't jump
        const others = prev.filter((x) => x.edgeId !== edgeId)
        const otherLocked = others.filter((x) => x.locked).reduce((a, x) => a + x.weight, 0)
        const otherUnlocked = others.filter((x) => !x.locked).length
        const snap = Math.max(0, 100 - otherLocked) / (otherUnlocked + 1)
        const seed = r.weight > 0 ? r.weight : snap
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
    <Modal
      title="Edit Rotator"
      open={open}
      width={640}
      onOk={handleApply}
      onCancel={onClose}
      okText="Apply"
      destroyOnHidden
    >
      <Form layout="vertical" className="pt-2">
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
            <div className="rounded border bg-background">
              <div className="grid grid-cols-[1fr_120px_72px] items-center gap-2 border-b px-3 py-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <span>Connection</span>
                <span className="text-right">Weight</span>
                <span className="text-right">Locked</span>
              </div>
              {rows.map((r) => {
                const displayed = r.locked ? r.weight : share
                return (
                  <div
                    key={r.edgeId}
                    className="grid grid-cols-[1fr_120px_72px] items-center gap-2 border-b px-3 py-1.5 last:border-b-0"
                  >
                    <span className="truncate text-sm" title={r.targetLabel}>
                      → {r.targetLabel}
                    </span>
                    <div className="flex items-center justify-end gap-1">
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
                    <div className="flex justify-end">
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
                  'flex items-center justify-between gap-2 px-3 py-2 text-xs',
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
    </Modal>
  )
}
