import { lazy, Suspense, useCallback, useEffect, type ReactNode } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField, Input, Modal } from '@/components/ui-kit'
import {
  NODE_TYPES,
  NODE_TYPE_LABELS,
  type FunnelFlowNode,
  type ExternalUrlNodeParams,
  type NodeTypeValue,
} from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import {
  externalUrlNodeFormSchema,
  type ExternalUrlNodeFormData,
} from '@/schemas/externalUrlNode'

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
  const params = node.data.params as ExternalUrlNodeParams

  const form = useForm<ExternalUrlNodeFormData>({
    resolver: zodResolver(externalUrlNodeFormSchema),
    defaultValues: {
      label: node.data.label ?? '',
      url: params.url ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      label: node.data.label ?? '',
      url: (node.data.params as ExternalUrlNodeParams).url ?? '',
    })
  }, [open, node, form])

  const handleOk = useCallback(async () => {
    const valid = await form.trigger()
    if (!valid) return false

    const data = form.getValues()
    const baseData: Record<string, unknown> = { label: data.label }

    switch (nt) {
      case NODE_TYPES.externalUrl:
        baseData.params = { ...((node.data.params as object) ?? {}), url: data.url }
        break
      default:
        baseData.params = node.data.params
        break
    }

    updateNodeData(nodeId, baseData)
    onClose()
    return undefined
  }, [form, node, nodeId, nt, onClose, updateNodeData])

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
      <div className="space-y-4 pt-2">
        <FormField label="Label" htmlFor="external-url-label">
          <Controller
            control={form.control}
            name="label"
            render={({ field }) => (
              <Input
                id="external-url-label"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                placeholder="Display name"
              />
            )}
          />
        </FormField>

        {nt === NODE_TYPES.externalUrl && (
          <FormField
            label="URL"
            htmlFor="external-url"
            error={form.formState.errors.url?.message}
            help="Full redirect URL including https://"
          >
            <Controller
              control={form.control}
              name="url"
              render={({ field }) => (
                <Input
                  id="external-url"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  placeholder="https://example.com"
                />
              )}
            />
          </FormField>
        )}
      </div>
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
