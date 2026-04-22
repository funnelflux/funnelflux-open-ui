import { Plus, X } from 'lucide-react'
import { Button, Tag } from '@/components/ui-kit'
import type { ConditionBlock as ConditionBlockType, ConditionRule } from '@/types/funnel'
import { ConditionRuleRow } from './ConditionRuleRow'

interface ConditionBlockProps {
  block: ConditionBlockType
  blockIndex: number
  onChange: (block: ConditionBlockType) => void
  onRemove: () => void
  canRemove: boolean
}

function createEmptyRule(): ConditionRule {
  return {
    field: 'country',
    operator: 'equals',
    value: '',
  }
}

export function ConditionBlock({
  block,
  blockIndex,
  onChange,
  onRemove,
  canRemove,
}: ConditionBlockProps) {
  function handleRuleChange(ruleIndex: number, rule: ConditionRule) {
    const updatedRules = [...block.rules]
    updatedRules[ruleIndex] = rule
    onChange({ ...block, rules: updatedRules })
  }

  function handleRuleRemove(ruleIndex: number) {
    // Keep at least one rule
    if (block.rules.length <= 1) return
    const updatedRules = block.rules.filter((_, i) => i !== ruleIndex)
    onChange({ ...block, rules: updatedRules })
  }

  function handleAddRule() {
    onChange({ ...block, rules: [...block.rules, createEmptyRule()] })
  }

  function toggleLogicOperator() {
    onChange({
      ...block,
      logicOperator: block.logicOperator === 'AND' ? 'OR' : 'AND',
    })
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      {/* Block header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Block {blockIndex + 1}</span>
          <Tag
            className="cursor-pointer select-none text-xs"
            onClick={toggleLogicOperator}
          >
            {block.logicOperator}
          </Tag>
          <span className="text-xs text-muted-foreground">between rules</span>
        </div>
        {canRemove && (
          <Button
            htmlType="button"
            type="text"
            className="h-7 w-7"
            onClick={onRemove}
            aria-label="Remove condition block"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Rules */}
      <div className="space-y-2">
        {block.rules.map((rule, ruleIndex) => (
          <ConditionRuleRow
            key={ruleIndex}
            rule={rule}
            onChange={(updated) => handleRuleChange(ruleIndex, updated)}
            onRemove={() => handleRuleRemove(ruleIndex)}
          />
        ))}
      </div>

      {/* Add rule button */}
      <Button
        htmlType="button"
        type="text"
        size="small"
        className="h-7 text-xs"
        onClick={handleAddRule}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Rule
      </Button>
    </div>
  )
}
