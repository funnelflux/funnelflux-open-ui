import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Resolver } from 'react-hook-form'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal, Tag, Select, Switch, Field, Button, Input, Spin } from '@/components/ui-kit'
import type { ConditionBlock as ConditionBlockType } from '@/types/funnel'
import type { FunnelCondition } from '@/types/entities'
import { conditionSchema, type ConditionFormValues } from '@/schemas/condition'
import { formDraftToFunnelCondition, funnelConditionToFormDraft } from '@/lib/funnelConditionFormBridge'
import { ConditionBlock } from './ConditionBlock'
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
    return rows
      .filter((c) => {
        const r = c.restrictToFunnelId
        if (r === undefined) return true
        return r === '' || r === '0'
      })
      .map((c) => ({ value: c.idCondition, label: c.conditionName }))
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
    })
  }, [copyFromConditionId, copyFromQuery.data, initialDraft, isNew, reset])

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
      if ((blocks?.length ?? 0) <= 1) return
      const next = (blocks ?? []).filter((_, i) => i !== index)
      setValue('blocks', next as ConditionBlockType[], { shouldDirty: true })
    },
    [blocks, setValue],
  )

  const handleAddBlock = useCallback(() => {
    const next = [...(blocks ?? []), createEmptyBlock()]
    setValue('blocks', next as ConditionBlockType[], { shouldDirty: true })
  }, [blocks, setValue])

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

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

  const handleSave = useCallback(() => {
    void handleSubmit(handleValidSubmit)()
  }, [handleSubmit, handleValidSubmit])

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      title={isNew ? 'New Condition' : 'Edit Condition'}
      width={720}
      footer={null}
      destroyOnHidden
    >
      {!(isNew === false && detailLoading) ? (
        <p className="text-sm text-muted-foreground mb-4">
          {isNew ? 'Define rules to route traffic based on visitor attributes.' : 'Modify the condition rules and logic.'}
        </p>
      ) : null}

      {!isNew && detailLoading ? (
        <div className="flex min-h-[200px] items-center justify-center py-8">
          <Spin />
        </div>
      ) : null}

      {isNew || !detailLoading ? (
      <div className="space-y-6">
        {isNew && (
          <Field
            title="Copy from Global Condition"
            htmlFor="copyFromGlobalCondition"
            description="Selecting a condition will copy its blocks and rules into this new condition."
          >
            <Select
              id="copyFromGlobalCondition"
              value={copyFromConditionId ?? undefined}
              onChange={handleCopyFromSelect}
              allowClear
              showSearch
              placeholder="Select a global condition to copy"
              options={globalConditionOptions}
              className="w-full"
              size="sm"
            />
          </Field>
        )}

        <Controller
          control={control}
          name="conditionName"
          render={({ field }) => (
            <Field
              title="Condition name"
              htmlFor="conditionName"
              required
              errorText={errors.conditionName?.message}
            >
              <Input
                id="conditionName"
                className="w-full"
                size="sm"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="e.g. US Desktop Only"
              />
            </Field>
          )}
        />

        {showScopeControl && (
          <Field
            title="Scope"
            htmlFor="conditionScopeToggle"
            errorText={errors.scope?.message}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">{scope === 'funnel' ? 'Local (Funnel)' : 'Global'}</div>
                <div className="text-xs text-muted-foreground">
                  {scope === 'global' ? 'Available across all funnels.' : 'Restricted to a single funnel.'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Global</span>
                <Switch id="conditionScopeToggle" checked={scope === 'funnel'} onChange={handleScopeToggle} />
                <span className="text-xs text-muted-foreground">Local</span>
              </div>
            </div>
          </Field>
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
          size="sm"
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

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSave} loading={isSubmitting}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>
      ) : null}
    </Modal>
  )
}
