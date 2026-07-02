import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { Resolver } from 'react-hook-form'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal, FormModalBody, FormModalFooter, FormModalHeader, Tag, Select, Switch, FormField, Button, Input, Spin } from '@/components/ui-kit'
import type { ConditionBlock as ConditionBlockType } from '@/types/funnel'
import type { FunnelCondition } from '@/types/entities'
import { conditionSchema, type ConditionFormValues } from '@/schemas/condition'
import { formDraftToFunnelCondition, funnelConditionToFormDraft } from '@/lib/funnelConditionFormBridge'
import { ConditionBlock } from '@/components/Condition'
import { useCondition, useConditions } from '@/api/hooks'

interface ConditionEditorProps {
  open: boolean
  onClose: () => void
  condition?: FunnelCondition | null
  /** When set, fixes create vs edit while `condition` is still null (e.g. detail fetch in flight). */
  mode?: 'create' | 'edit'
  /** When mode is `edit`, show a loading state until `condition` is available. */
  detailLoading?: boolean
  onSave: (condition: FunnelCondition) => void
  /** When creating a funnel-scoped condition from within a funnel, pass its ID so the payload is valid. */
  localScopeFunnelId?: string
  /** Scope is derived from context; show this only in flows that intentionally let users switch it. */
  showScopeControl?: boolean
}

function createEmptyBlock(): ConditionBlockType {
  return {
    logicOperator: 'AND',
    rules: [{ field: 'country', operator: 'equals', value: '' }],
  }
}

export function ConditionEditor({
  open,
  onClose,
  condition,
  mode,
  detailLoading = false,
  onSave,
  localScopeFunnelId,
  showScopeControl = false,
}: ConditionEditorProps) {
  const isNew = mode !== undefined ? mode === 'create' : !condition
  const sessionKey = condition?.idCondition ?? 'new'

  const wireSnapshot = condition ?? null

  const initialDraft = useMemo<ConditionFormValues>(() => {
    if (!condition) {
      return {
        idCondition: undefined,
        conditionName: '',
        scope: localScopeFunnelId ? 'funnel' : 'global',
        blocks: [createEmptyBlock()],
        blockLogicOperator: 'AND',
      }
    }
    return funnelConditionToFormDraft(condition) as ConditionFormValues
  }, [condition, localScopeFunnelId])

  const {
    control,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConditionFormValues>({
    resolver: zodResolver(conditionSchema) as unknown as Resolver<ConditionFormValues>,
    defaultValues: initialDraft,
    mode: 'onSubmit',
  })

  useEffect(() => {
    reset(initialDraft)
  }, [initialDraft, reset, sessionKey])

  const scope = useWatch({ control, name: 'scope' })
  const blocks = useWatch({ control, name: 'blocks' })
  const blockLogicOperator = useWatch({ control, name: 'blockLogicOperator' })

  const { data: conditionList } = useConditions()
  const globalConditionOptions = useMemo(() => {
    const rows = conditionList ?? []
    return rows.map((c) => ({ value: c.idCondition, label: c.conditionName }))
  }, [conditionList])

  const [copyFromConditionId, setCopyFromConditionId] = useState<string | null>(null)
  const copyFromQuery = useCondition(copyFromConditionId ?? '')

  const handleCopyFromSelect = useCallback((value: string | undefined) => {
    setCopyFromConditionId(value && value !== '' ? value : null)
  }, [])

  useEffect(() => {
    if (!isNew) return
    if (!copyFromConditionId) return
    const c = copyFromQuery.data
    if (!c) return
    const draft = funnelConditionToFormDraft(c) as ConditionFormValues
    queueMicrotask(() => {
      reset(
        {
          ...initialDraft,
          conditionName: initialDraft.conditionName ? initialDraft.conditionName : draft.conditionName,
          blocks: draft.blocks.length > 0 ? (draft.blocks as ConditionBlockType[]) : [createEmptyBlock()],
          blockLogicOperator: draft.blockLogicOperator,
        },
        { keepDirty: true, keepTouched: true },
      )
      setCopyFromConditionId(null)
    })
  }, [copyFromConditionId, copyFromQuery.data, initialDraft, isNew, reset])

  const formId = useId()

  const modalTitle = isNew ? 'New Condition' : 'Edit Condition'

  const copyFromHeaderActions = useMemo(() => {
    if (!isNew || globalConditionOptions.length === 0) return undefined
    return (
      <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
        <span className="shrink-0">Use template</span>
        <Select
          allowClear
          value={copyFromConditionId ?? undefined}
          placeholder="Select template"
          className="w-52"
          size="sm"
          onChange={handleCopyFromSelect}
          options={globalConditionOptions}
        />
      </div>
    )
  }, [copyFromConditionId, globalConditionOptions, handleCopyFromSelect, isNew])

  const modalDescription = !(isNew === false && detailLoading)
    ? (isNew ? 'Define rules to route traffic based on visitor attributes.' : 'Modify the condition rules and logic.')
    : undefined

  const handleScopeToggle = useCallback(
    (checked: boolean) => {
      setValue('scope', checked ? 'funnel' : 'global', { shouldDirty: true, shouldTouch: true })
    },
    [setValue],
  )

  const toggleBlockLogicOperator = useCallback(() => {
    setValue('blockLogicOperator', blockLogicOperator === 'AND' ? 'OR' : 'AND', { shouldDirty: true })
  }, [blockLogicOperator, setValue])

  const handleBlockChange = useCallback(
    (index: number, updatedBlock: ConditionBlockType) => {
      setValue(`blocks.${index}`, updatedBlock, { shouldDirty: true })
    },
    [setValue],
  )

  const handleBlockRemove = useCallback(
    (index: number) => {
      // Use getValues so we never drop in-flight edits in other blocks (useWatch can lag setValue).
      const current = (getValues('blocks') ?? []) as ConditionBlockType[]
      if (current.length <= 1) return
      const next = current.filter((_, i) => i !== index)
      setValue('blocks', next, { shouldDirty: true })
    },
    [getValues, setValue],
  )

  const handleAddBlock = useCallback(() => {
    const current = (getValues('blocks') ?? []) as ConditionBlockType[]
    setValue('blocks', [...current, createEmptyBlock()], { shouldDirty: true })
  }, [getValues, setValue])

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

  const handleAfterClose = useCallback(() => {
    setCopyFromConditionId(null)
  }, [])

  const handleValidSubmit = useCallback(
    (values: ConditionFormValues) => {
      const payload = formDraftToFunnelCondition(values, wireSnapshot)
      if (values.scope === 'funnel' && localScopeFunnelId) {
        payload.restrictToFunnelId = localScopeFunnelId
      }
      if (isNew) {
        ;(payload as FunnelCondition & { __isNew?: boolean }).__isNew = true
      }
      onSave(payload)
    },
    [isNew, localScopeFunnelId, onSave, wireSnapshot],
  )

  return (
    <FormModal
      open={open}
      onCancel={handleCancel}
      afterClose={handleAfterClose}
      destroyOnHidden
    >
      <FormModalHeader
        title={modalTitle}
        description={modalDescription}
        actions={copyFromHeaderActions}
      />
      <FormModalBody>
        {!isNew && detailLoading ? (
          <div className="flex min-h-[200px] items-center justify-center py-8">
            <Spin />
          </div>
        ) : isNew || !detailLoading ? (
          <form id={formId} onSubmit={handleSubmit(handleValidSubmit)} className="space-y-6">
        <Controller
          control={control}
          name="conditionName"
          render={({ field }) => (
            <FormField
              label="Condition name"
              htmlFor="conditionName"
              required
              error={errors.conditionName?.message}
            >
              <Input
                id="conditionName"
                className="w-full"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="e.g. US Desktop Only"
              />
            </FormField>
          )}
        />

        {showScopeControl && (
          <FormField
            label="Scope"
            htmlFor="conditionScopeToggle"
            error={errors.scope?.message}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <div className="font-medium">{scope === 'funnel' ? 'Local (Funnel)' : 'Global'}</div>
                <div className="text-xs text-muted-foreground">
                  {scope === 'global' ? 'Available across all funnels.' : 'Restricted to a single funnel.'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">Global</span>
                <Switch id="conditionScopeToggle" checked={scope === 'funnel'} onChange={handleScopeToggle} />
                <span className="text-xs text-muted-foreground">Local</span>
              </div>
            </div>
          </FormField>
        )}

        {(blocks?.length ?? 0) >= 2 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Between blocks:</span>
            <Tag className="cursor-pointer select-none" onClick={toggleBlockLogicOperator}>
              {blockLogicOperator}
            </Tag>
          </div>
        )}

        <div className="space-y-3">
          {(blocks ?? []).map((block, index) => (
            <div key={index}>
              {index > 0 && (
                <div className="flex items-center justify-center py-1">
                  <span className="text-xs font-medium text-muted-foreground">{blockLogicOperator}</span>
                </div>
              )}
              <ConditionBlock
                block={block as ConditionBlockType}
                blockIndex={index}
                onChange={(updated) => handleBlockChange(index, updated)}
                onRemove={() => handleBlockRemove(index)}
                canRemove={(blocks?.length ?? 0) > 1}
              />
            </div>
          ))}
        </div>

        <Button
          htmlType="button"
          onClick={handleAddBlock}
          iconName="plus"
          iconSize="sm"
        >
          Add Block
        </Button>

        {(errors.blocks?.message || errors.blockLogicOperator?.message) && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errors.blocks?.message ?? errors.blockLogicOperator?.message}
          </div>
        )}

          </form>
        ) : null}
      </FormModalBody>
      {isNew || !detailLoading ? (
        <FormModalFooter>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" form={formId} loading={isSubmitting}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </FormModalFooter>
      ) : null}
    </FormModal>
  )
}
