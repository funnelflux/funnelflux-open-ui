import { useState } from 'react'
import { Form } from '@/components/ui-kit'
import { Input, Modal } from '@/components/ui-kit'
import {
  NODE_TYPES,
  NODE_TYPE_LABELS,
  type FunnelFlowNode,
  type ExternalUrlNodeParams,
  type VisitorTagNodeParams,
  type ConditionNodeParams,
  type JsCodeNodeParams,
  type NodeTypeValue,
} from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { LanderNodeEditModal } from './LanderNodeEditModal'
import { OfferNodeEditModal } from './OfferNodeEditModal'
import { RotatorNodeEditModal } from './RotatorNodeEditModal'

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

  // Visitor Tag
  const [tagKey, setTagKey] = useState(() => (node.data.params as VisitorTagNodeParams).tagKey ?? '')
  const [tagValue, setTagValue] = useState(() => (node.data.params as VisitorTagNodeParams).tagValue ?? '')

  // Condition
  const [conditionId, setConditionId] = useState(() => (node.data.params as ConditionNodeParams).conditionId ?? '')

  // Code snippet
  const [snippetId, setSnippetId] = useState(() => (node.data.params as JsCodeNodeParams).snippetId ?? '')

  const handleOk = () => {
    const baseData: Record<string, unknown> = { label }

    switch (nt) {
      case NODE_TYPES.externalUrl:
        baseData.params = { ...((node.data.params as object) ?? {}), url }
        break
      case NODE_TYPES.visitorTag:
        baseData.params = { ...((node.data.params as object) ?? {}), tagKey, tagValue }
        break
      case NODE_TYPES.condition:
        baseData.params = { ...((node.data.params as object) ?? {}), conditionId, conditionName: label }
        break
      case NODE_TYPES.jsCode:
      case NODE_TYPES.phpCode:
        baseData.params = { ...((node.data.params as object) ?? {}), snippetId, snippetName: label }
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

        {nt === NODE_TYPES.visitorTag && (
          <>
            <Form.Item label="Tag Key">
              <Input value={tagKey} onChange={(e) => setTagKey(e.target.value)} placeholder="tag_name" />
            </Form.Item>
            <Form.Item label="Tag Value">
              <Input value={tagValue} onChange={(e) => setTagValue(e.target.value)} placeholder="tag_value" />
            </Form.Item>
          </>
        )}

        {nt === NODE_TYPES.condition && (
          <Form.Item label="Condition ID" extra="ID of the condition to evaluate">
            <Input value={conditionId} onChange={(e) => setConditionId(e.target.value)} className="font-mono text-sm" />
          </Form.Item>
        )}

        {(nt === NODE_TYPES.jsCode || nt === NODE_TYPES.phpCode) && (
          <Form.Item label="Code Snippet ID" extra="ID of the code snippet to execute">
            <Input value={snippetId} onChange={(e) => setSnippetId(e.target.value)} className="font-mono text-sm" />
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

  if (nt === NODE_TYPES.lander) {
    return <LanderNodeEditModal nodeId={nodeId} open={open} onClose={onClose} />
  }

  if (nt === NODE_TYPES.offer) {
    return <OfferNodeEditModal nodeId={nodeId} open={open} onClose={onClose} />
  }

  if (nt === NODE_TYPES.rotator) {
    return (
      <RotatorNodeEditModal
        key={nodeId ?? node.id}
        nodeId={nodeId}
        open={open}
        onClose={onClose}
      />
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
