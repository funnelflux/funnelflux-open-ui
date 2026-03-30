import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Condition, ConditionBlock as ConditionBlockType } from '@/types/funnel'
import { conditionSchema } from '@/schemas/condition'
import { ConditionBlock } from './ConditionBlock'

interface ConditionEditorProps {
  open: boolean
  onClose: () => void
  condition?: Condition | null
  onSave: (condition: Condition) => void
}

function createEmptyBlock(): ConditionBlockType {
  return {
    logicOperator: 'AND',
    rules: [{ field: 'country', operator: 'equals', value: '' }],
  }
}

function createDefaultState(): {
  conditionName: string
  scope: 'global' | 'funnel'
  blocks: ConditionBlockType[]
  blockLogicOperator: 'AND' | 'OR'
} {
  return {
    conditionName: '',
    scope: 'global',
    blocks: [createEmptyBlock()],
    blockLogicOperator: 'AND',
  }
}

export function ConditionEditor({ open, onClose, condition, onSave }: ConditionEditorProps) {
  const isNew = !condition
  const [conditionName, setConditionName] = useState('')
  const [scope, setScope] = useState<'global' | 'funnel'>('global')
  const [blocks, setBlocks] = useState<ConditionBlockType[]>([createEmptyBlock()])
  const [blockLogicOperator, setBlockLogicOperator] = useState<'AND' | 'OR'>('AND')
  const [errors, setErrors] = useState<string[]>([])

  // Reset state when the sheet opens or the condition changes
  useEffect(() => {
    if (open) {
      if (condition) {
        setConditionName(condition.conditionName)
        setScope(condition.scope)
        setBlocks(condition.blocks.length > 0 ? condition.blocks : [createEmptyBlock()])
        setBlockLogicOperator(condition.blockLogicOperator)
      } else {
        const defaults = createDefaultState()
        setConditionName(defaults.conditionName)
        setScope(defaults.scope)
        setBlocks(defaults.blocks)
        setBlockLogicOperator(defaults.blockLogicOperator)
      }
      setErrors([])
    }
  }, [open, condition])

  function handleBlockChange(index: number, updatedBlock: ConditionBlockType) {
    const updated = [...blocks]
    updated[index] = updatedBlock
    setBlocks(updated)
  }

  function handleBlockRemove(index: number) {
    if (blocks.length <= 1) return
    setBlocks(blocks.filter((_, i) => i !== index))
  }

  function handleAddBlock() {
    setBlocks([...blocks, createEmptyBlock()])
  }

  function toggleBlockLogicOperator() {
    setBlockLogicOperator((prev) => (prev === 'AND' ? 'OR' : 'AND'))
  }

  function handleSave() {
    const formData = {
      idCondition: condition?.idCondition,
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

    const saved: Condition = {
      idCondition: condition?.idCondition ?? '',
      conditionName: result.data.conditionName,
      scope: result.data.scope,
      blocks: result.data.blocks as ConditionBlockType[],
      blockLogicOperator: result.data.blockLogicOperator,
    }

    onSave(saved)
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="sm:max-w-[600px] flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New Condition' : 'Edit Condition'}</SheetTitle>
          <SheetDescription>
            {isNew
              ? 'Define rules to route traffic based on visitor attributes.'
              : 'Modify the condition rules and logic.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="conditionName" className="text-sm">
              Name
            </Label>
            <Input
              id="conditionName"
              className="h-8 text-sm"
              value={conditionName}
              onChange={(e) => setConditionName(e.target.value)}
              placeholder="e.g. US Desktop Only"
            />
          </div>

          {/* Scope toggle */}
          <div className="space-y-2">
            <Label className="text-sm">Scope</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scope === 'global' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-sm"
                onClick={() => setScope('global')}
              >
                Global
              </Button>
              <Button
                type="button"
                variant={scope === 'funnel' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-sm"
                onClick={() => setScope('funnel')}
              >
                Funnel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {scope === 'global'
                ? 'Available across all funnels.'
                : 'Only available within this funnel.'}
            </p>
          </div>

          {/* Block logic operator (only when 2+ blocks) */}
          {blocks.length >= 2 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Between blocks:</span>
              <Badge
                variant="outline"
                className="cursor-pointer select-none"
                onClick={toggleBlockLogicOperator}
              >
                {blockLogicOperator}
              </Badge>
            </div>
          )}

          {/* Blocks */}
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

          {/* Add block */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-sm"
            onClick={handleAddBlock}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Block
          </Button>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <ul className="list-disc pl-4 space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <SheetFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
