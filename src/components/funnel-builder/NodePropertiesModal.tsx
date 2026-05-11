import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Form } from '@/components/ui-kit'
import { Input, Modal } from '@/components/ui-kit'
import {
  NODE_TYPES,
  NODE_TYPE_LABELS,
  type FunnelFlowNode,
  type ExternalUrlNodeParams,
  type NodeTypeValue,
} from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'

const LanderNodeEditModal = lazy(() =>
  import('./LanderNodeEditModal').then((module) => ({
    default: module.LanderNodeEditModal,
  })),
)
const OfferNodeEditModal = lazy(() =>
  import('./OfferNodeEditModal').then((module) => ({
    default: module.OfferNodeEditModal,
  })),
)
const RotatorNodeEditModal = lazy(() =>
  import('./RotatorNodeEditModal').then((module) => ({
    default: module.RotatorNodeEditModal,
  })),
)
const ConditionNodeEditDrawer = lazy(() =>
  import('./ConditionNodeEditDrawer').then((module) => ({
    default: module.ConditionNodeEditDrawer,
  })),
)
const VisitorTagNodeEditModal = lazy(() =>
  import('./VisitorTagNodeEditModal').then((module) => ({
    default: module.VisitorTagNodeEditModal,
  })),
)
const CodeNodeEditModal = lazy(() =>
  import('./CodeNodeEditModal').then((module) => ({
    default: module.CodeNodeEditModal,
  })),
)

interface NodePropertiesModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

function GenericNodePropertiesModal({
  nodeId,
  node,
  open,
  onClose,
}: {
  nodeId: string
  node: FunnelFlowNode
  open: boolean
  onClose: () => void
}) {
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)
  const nt = node.data.nodeType

  const [label, setLabel] = useState(() => node.data.label ?? '')

  // External URL
  const [url, setUrl] = useState(() => (node.data.params as ExternalUrlNodeParams).url ?? '')

  const handleOk = () => {
    const baseData: Record<string, unknown> = { label }

    switch (nt) {
      case NODE_TYPES.externalUrl:
        baseData.params = { ...((node.data.params as object) ?? {}), url }
        break
      default:
        baseData.params = node.data.params
        break
    }

    updateNodeData(nodeId, baseData)
    onClose()
  }

  const title = `Edit ${NODE_TYPE_LABELS[nt as NodeTypeValue] ?? 'Node'}`

  return (
    <Modal
      title={title}
      open={open}
      width={640}
      onOk={handleOk}
      onCancel={onClose}
      okText="Apply"
      destroyOnHidden
    >
      <Form layout="vertical" className="pt-2">
        <Form.Item label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display name" />
        </Form.Item>

        {nt === NODE_TYPES.externalUrl && (
          <Form.Item label="URL" extra="Full redirect URL including https://">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          </Form.Item>
        )}

      </Form>
    </Modal>
  )
}

export function NodePropertiesModal({ nodeId, open, onClose }: NodePropertiesModalProps) {
  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )

  if (!node) return null

  const nt = node.data.nodeType
  const withFallback = (element: ReactNode) => (
    <Suspense fallback={null}>{element}</Suspense>
  )

  if (nt === NODE_TYPES.condition) {
    return withFallback(
      <ConditionNodeEditDrawer nodeId={nodeId ?? node.id} open={open} onClose={onClose} />,
    )
  }

  if (nt === NODE_TYPES.lander) {
    return withFallback(<LanderNodeEditModal nodeId={nodeId} open={open} onClose={onClose} />)
  }

  if (nt === NODE_TYPES.offer) {
    return withFallback(<OfferNodeEditModal nodeId={nodeId} open={open} onClose={onClose} />)
  }

  if (nt === NODE_TYPES.visitorTag) {
    return withFallback(
      <VisitorTagNodeEditModal
        key={nodeId ?? node.id}
        nodeId={nodeId ?? node.id}
        open={open}
        onClose={onClose}
      />,
    )
  }

  if (nt === NODE_TYPES.rotator) {
    return withFallback(
      <RotatorNodeEditModal
        key={nodeId ?? node.id}
        nodeId={nodeId}
        open={open}
        onClose={onClose}
      />,
    )
  }

  if (nt === NODE_TYPES.jsCode) {
    return withFallback(
      <CodeNodeEditModal nodeId={nodeId ?? node.id} codeType="javascript" open={open} onClose={onClose} />
    )
  }

  if (nt === NODE_TYPES.phpCode) {
    return withFallback(
      <CodeNodeEditModal nodeId={nodeId ?? node.id} codeType="php" open={open} onClose={onClose} />
    )
  }

  return (
    <GenericNodePropertiesModal
      key={nodeId ?? node.id}
      nodeId={nodeId ?? node.id}
      node={node}
      open={open}
      onClose={onClose}
    />
  )
}
