import { useEffect } from 'react'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Input,
  Select,
  Switch,
  FormModal,
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  useToastApi,
} from '@/components/ui-kit'
import {
  nodeAdvancedSettingsSchema,
  type NodeAdvancedSettingsFormData,
} from '@/schemas/nodeAdvancedSettings'
import { NODE_TYPES, type LanderNodeParams, type OfferNodeParams } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { cn } from '@/lib/utils'
import { TOKEN_SELECT_OPTIONS, toNodeAdditionalTokens } from './pageNodeModalShared'

interface NodeAdvancedSettingsModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

export function NodeAdvancedSettingsModal({ nodeId, open, onClose }: NodeAdvancedSettingsModalProps) {
  const toast = useToastApi()
  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)

  const nodeType = node?.data.nodeType
  const isPageNode = nodeType === NODE_TYPES.lander || nodeType === NODE_TYPES.offer

  const form = useForm<NodeAdvancedSettingsFormData>({
    resolver: zodResolver(nodeAdvancedSettingsSchema),
    defaultValues: {
      accumulateUrlParams: false,
      additionalTokens: [{ field: '', token: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'additionalTokens',
  })

  const accumulateUrlParamsWatch = useWatch({
    control: form.control,
    name: 'accumulateUrlParams',
    defaultValue: false,
  })

  useEffect(() => {
    if (!open || !node || !isPageNode) return
    const params = node.data.params as LanderNodeParams | OfferNodeParams
    form.reset({
      accumulateUrlParams: params.accumulateUrlParams ?? false,
      additionalTokens:
        params.additionalTokens && params.additionalTokens.length > 0
          ? params.additionalTokens.map((tokenRow) => ({
              field: tokenRow.field,
              token: tokenRow.token,
            }))
          : [{ field: '', token: '' }],
    })
  }, [open, node, isPageNode, form])

  const onSubmit = (data: NodeAdvancedSettingsFormData) => {
    if (!nodeId || !node) return
    const tokens = toNodeAdditionalTokens(data.additionalTokens)
    updateNodeData(nodeId, {
      params: {
        ...(node.data.params as object),
        accumulateUrlParams: data.accumulateUrlParams,
        additionalTokens: tokens,
      },
    })
    toast.success('Advanced funnel settings staged. Save the funnel to persist them.')
    onClose()
  }

  if (!isPageNode) {
    return null
  }

  return (
    <FormModal open={open} onCancel={onClose} destroyOnHidden mask={{ closable: false }} width={520}>
      <FormModalHeader
        title="Advanced funnel settings"
        description="URL pass-through options for this funnel node. Changes apply when visitors reach this page from this funnel."
      />
      <FormModalBody>
        <form
          id="node-advanced-settings-form"
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <div className="space-y-0.5">
              <label htmlFor="adv-acc-url" className="text-sm font-normal text-foreground">
                Pass accumulated URL parameters
              </label>
              <p className="text-xs text-muted-foreground">
                Include all accumulated query parameters from the visitor journey on the redirect URL.
              </p>
            </div>
            <Switch
              id="adv-acc-url"
              checked={Boolean(accumulateUrlParamsWatch)}
              onChange={(checked) => form.setValue('accumulateUrlParams', checked, { shouldDirty: true })}
            />
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">URL tokens</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional query parameters appended when visitors reach this page from this funnel.
              </p>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="space-y-1.5">
                  <span className={cn('block text-sm font-medium text-foreground', index > 0 && 'sr-only')}>
                    Query field
                  </span>
                  <Controller
                    control={form.control}
                    name={`additionalTokens.${index}.field`}
                    render={({ field: inputField }) => (
                      <Input
                        placeholder="field_name"
                        value={inputField.value}
                        onChange={(event) => inputField.onChange(event.target.value)}
                        onBlur={inputField.onBlur}
                        size="md"
                        className="h-control-md font-mono text-sm"
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className={cn('block text-sm font-medium text-foreground', index > 0 && 'sr-only')}>
                    Token
                  </span>
                  <Controller
                    control={form.control}
                    name={`additionalTokens.${index}.token`}
                    render={({ field: inputField }) => (
                      <Select
                        className="h-control-md w-full font-mono text-xs"
                        value={inputField.value || '__pick__'}
                        onChange={(value) => {
                          inputField.onChange(value === '__pick__' ? '' : value)
                        }}
                        options={TOKEN_SELECT_OPTIONS}
                        placeholder="Insert…"
                        alphabetical={false}
                      />
                    )}
                  />
                </div>
                <div className="flex justify-end sm:justify-center">
                  <Button
                    htmlType="button"
                    type="text"
                    size="md"
                    className="text-muted-foreground"
                    title="Remove row"
                    disabled={fields.length <= 1}
                    iconName="trash-2"
                    onClick={() => remove(index)}
                  />
                </div>
              </div>
            ))}
            <Button
              htmlType="button"
              iconName="plus"
              iconSize="sm"
              onClick={() => append({ field: '', token: '' })}
            >
              Pass another token
            </Button>
          </div>
        </form>
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" form="node-advanced-settings-form">
          Save
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
