import { useState, useCallback } from 'react'
import { Drawer, Tag } from '@/components/ui-kit'
import { Button, Input } from '@/components/ui-kit'
import type { ConditionBlock as ConditionBlockType } from '@/types/funnel'
import type { FunnelCondition } from '@/types/entities'
import { conditionSchema } from '@/schemas/condition'
import { formDraftToFunnelCondition, funnelConditionToFormDraft } from '@/lib/funnelConditionFormBridge'
import { ConditionBlock } from './ConditionBlock'

interface ConditionEditorProps {
  open: boolean
  onClose: () => void
  condition?: FunnelCondition | null
  onSave: (condition: FunnelCondition) => void
}

function createEmptyBlock(): ConditionBlockType {
  return {
    logicOperator: 'AND',
    rules: [{ field: 'country', operator: 'equals', value: '' }],
  }
}

interface ConditionEditorFormProps {
  initialCondition: FunnelCondition | null
  wireSnapshot: FunnelCondition | null
  onSave: (condition: FunnelCondition) => void
  onClose: () => void
}

function ConditionEditorForm({
  initialCondition,
  wireSnapshot,
  onSave,
  onClose,
}: ConditionEditorFormProps) {
  const isNew = !initialCondition
  const [conditionName, setConditionName] = useState(
    () => initialCondition?.conditionName ?? '',
  )
  const [scope, setScope] = useState<'global' | 'funnel'>(() =>
    initialCondition?.restrictToFunnelId ? 'funnel' : 'global',
  )
  const [blocks, setBlocks] = useState<ConditionBlockType[]>(() => {
    if (!initialCondition) return [createEmptyBlock()]
    const draft = funnelConditionToFormDraft(initialCondition)
    const nextBlocks =
      draft.blocks.length > 0 ? draft.blocks : [createEmptyBlock()]
    return nextBlocks as ConditionBlockType[]
  })
  const [blockLogicOperator, setBlockLogicOperator] = useState<'AND' | 'OR'>(() => {
    if (!initialCondition) return 'AND'
    return funnelConditionToFormDraft(initialCondition).blockLogicOperator
  })
  const [errors, setErrors] = useState<string[]>([])

  const handleBlockChange = useCallback((index: number, updatedBlock: ConditionBlockType) => {
    setBlocks((prev) => {
      const next = [...prev]
      next[index] = updatedBlock
      return next
    })
  }, [])

  const handleBlockRemove = useCallback((index: number) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleAddBlock = useCallback(() => {
    setBlocks((prev) => [...prev, createEmptyBlock()])
  }, [])

  const toggleBlockLogicOperator = useCallback(() => {
    setBlockLogicOperator((prev) => (prev === 'AND' ? 'OR' : 'AND'))
  }, [])

  function handleSave() {
    setErrors([])
    const formData = {
      idCondition: initialCondition?.idCondition,
      conditionName,
      scope,
      blocks,
      blockLogicOperator,
    }

    const result = conditionSchema.safeParse(formData)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)
      setErrors(messages)
      return
    }

    try {
      const payload = formDraftToFunnelCondition(result.data, wireSnapshot)
      onSave(payload)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Could not build condition for API.'])
    }
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        {isNew
          ? 'Define rules to route traffic based on visitor attributes.'
          : 'Modify the condition rules and logic.'}
      </p>

      <div className="flex-1 space-y-6 py-4">
        <div className="space-y-2">
          <label htmlFor="conditionName" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="conditionName"
            className="h-8 text-sm"
            value={conditionName}
            onChange={(e) => setConditionName(e.target.value)}
            placeholder="e.g. US Desktop Only"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Scope</label>
          <div className="flex gap-2">
            <Button
              htmlType="button"
              type={scope === 'global' ? 'primary' : 'default'}
              size="small"
              className="h-8 text-sm"
              onClick={() => setScope('global')}
            >
              Global
            </Button>
            <Button
              htmlType="button"
              type={scope === 'funnel' ? 'primary' : 'default'}
              size="small"
              className="h-8 text-sm"
              onClick={() => setScope('funnel')}
            >
              Funnel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {scope === 'global'
              ? 'Available across all funnels.'
              : 'Restricted to a single funnel (set when saving from funnel context).'}
          </p>
        </div>

        {blocks.length >= 2 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Between blocks:</span>
            <Tag
              className="cursor-pointer select-none"
              onClick={toggleBlockLogicOperator}
            >
              {blockLogicOperator}
            </Tag>
          </div>
        )}

        <div className="space-y-3">
          {blocks.map((block, index) => (
            <div key={index}>
              {index > 0 && (
                <div className="flex items-center justify-center py-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {blockLogicOperator}
                  </span>
                </div>
              )}
              <ConditionBlock
                block={block}
                blockIndex={index}
                onChange={(updated) => handleBlockChange(index, updated)}
                onRemove={() => handleBlockRemove(index)}
                canRemove={blocks.length > 1}
              />
            </div>
          ))}
        </div>

        <Button
          htmlType="button"
          size="small"
          className="h-8 text-sm"
          onClick={handleAddBlock}
          iconName="plus"
          iconSize="sm"
        >
          Add Block
        </Button>

        {errors.length > 0 && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSave}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>
    </>
  )
}

export function ConditionEditor({ open, onClose, condition, onSave }: ConditionEditorProps) {
  const isNew = !condition
  const sessionKey = condition?.idCondition ?? 'new'

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isNew ? 'New Condition' : 'Edit Condition'}
      size={600}
      destroyOnHidden
    >
      {open ? (
        <ConditionEditorForm
          key={sessionKey}
          initialCondition={condition ?? null}
          wireSnapshot={condition ?? null}
          onSave={onSave}
          onClose={onClose}
        />
      ) : null}
    </Drawer>
  )
}
