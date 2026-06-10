import { lazy, Suspense, useCallback, useEffect, useId, type ReactNode } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField, Input, FormModal, FormModalBody, FormModalFooter, FormModalHeader, Button } from '@/components/ui-kit'
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

const PageNodeEditModal = lazy(() =>
  import('./PageNodeEditModal').then((module) => ({
    default: module.PageNodeEditModal,
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

  const formId = useId()

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      const valid = await form.trigger()
      if (!valid) return

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
    },
    [form, node, nodeId, nt, onClose, updateNodeData],
  )

  const title = `Edit ${NODE_TYPE_LABELS[nt as NodeTypeValue] ?? 'Node'}`

  return (
    <FormModal open={open} onCancel={onClose} destroyOnHidden>
      <FormModalHeader title={title} />
      <FormModalBody>
        <form id={formId} onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
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
        </form>
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" form={formId}>
          Apply
        </Button>
      </FormModalFooter>
    </FormModal>
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
    return withFallback(
      <PageNodeEditModal nodeId={nodeId} pageType="lander" open={open} onClose={onClose} />,
    )
  }

  if (nt === NODE_TYPES.offer) {
    return withFallback(
      <PageNodeEditModal nodeId={nodeId} pageType="offer" open={open} onClose={onClose} />,
    )
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
