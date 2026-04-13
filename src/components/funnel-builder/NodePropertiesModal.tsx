import { useState } from 'react'
import { Form } from 'antd'
import { Input, Modal } from '@/components/ui-kit'
import { NODE_TYPES, type FunnelFlowNode, type LanderNodeParams, type OfferNodeParams } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { LanderNodeEditModal } from './LanderNodeEditModal'
import { OfferNodeEditModal } from './OfferNodeEditModal'

interface NodePropertiesModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

/** `key={nodeId}` on this subtree remounts when the selected node changes, so label/pageId init from `node` without a sync effect. */
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

  const [label, setLabel] = useState(() => node.data.label ?? '')
  const [pageId, setPageId] = useState(() => {
    const p = node.data.params as LanderNodeParams & OfferNodeParams
    return p.pageId ?? ''
  })

  const nt = node.data.nodeType
  const isPage = nt === NODE_TYPES.lander || nt === NODE_TYPES.offer

  const handleOk = () => {
    updateNodeData(nodeId, {
      label,
      params: isPage
        ? { ...((node.data.params as object) ?? {}), pageId, pageName: label }
        : node.data.params,
    })
    onClose()
  }

  return (
    <Modal
      title="Node properties"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Apply"
      destroyOnClose
    >
      <Form layout="vertical" className="pt-2">
        <Form.Item label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display name" />
        </Form.Item>
        {isPage && (
          <Form.Item label="Page ID" extra="Lander or offer page id in FunnelFlux">
            <Input value={pageId} onChange={(e) => setPageId(e.target.value)} className="font-mono text-sm" />
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
