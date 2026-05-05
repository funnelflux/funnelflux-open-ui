import { Button, Input, Select } from '@/components/ui-kit'
import type { ConditionRule, ConditionField, ConditionOperator } from '@/types/funnel'
import { CONDITION_FIELDS, CONDITION_OPERATORS } from '@/types/funnel'
import { ConditionFieldValueInput } from './ConditionFieldValueInput'

interface ConditionRuleRowProps {
  rule: ConditionRule
  onChange: (rule: ConditionRule) => void
  onRemove: () => void
}

const FIELD_LABELS: Record<ConditionField, string> = {
  country: 'Country',
  region: 'Region',
  city: 'City',
  language: 'Language',
  isp: 'ISP',
  ip: 'IP Address',
  deviceType: 'Device Type',
  os: 'OS',
  osVersion: 'OS Version',
  browser: 'Browser',
  browserVersion: 'Browser Version',
  brand: 'Device Brand',
  model: 'Device Model',
  connectionType: 'Connection Type',
  referrer: 'Referrer',
  referrerDomain: 'Referrer Domain',
  userAgent: 'User Agent',
  dayOfWeek: 'Day of Week',
  hourOfDay: 'Hour of Day',
  visitorTag: 'Visitor Tag',
  queryParam: 'Query Param',
  customField: 'Custom Field',
}

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'equals',
  notEquals: 'does not equal',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  in: 'is in',
  notIn: 'is not in',
  greaterThan: 'greater than',
  lessThan: 'less than',
  between: 'between',
  matches: 'matches regex',
  exists: 'exists',
  notExists: 'does not exist',
}

const EXTRA_KEY_FIELDS: ConditionField[] = ['visitorTag', 'queryParam', 'customField']
const CONDITION_FIELD_OPTIONS = CONDITION_FIELDS.map((f) => ({ value: f, label: FIELD_LABELS[f] }))
const CONDITION_OPERATOR_OPTIONS = CONDITION_OPERATORS.map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))

export function ConditionRuleRow({ rule, onChange, onRemove }: ConditionRuleRowProps) {
  const needsExtraKey = EXTRA_KEY_FIELDS.includes(rule.field)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Field selector */}
      <Select
        value={rule.field || undefined}
        onChange={(val) =>
          onChange({ ...rule, field: val as ConditionField, value: '', extraKey: undefined })
        }
        placeholder="Field"
        className="w-40 shrink-0"
        alphabetical={false}
        options={CONDITION_FIELD_OPTIONS}
      />

      {/* Extra key input for visitorTag, queryParam, customField */}
      {needsExtraKey && (
        <Input
          className="w-28 shrink-0"
          value={rule.extraKey ?? ''}
          onChange={(e) => onChange({ ...rule, extraKey: e.target.value })}
          placeholder="Key"
        />
      )}

      {/* Operator selector */}
      <Select
        value={rule.operator || undefined}
        onChange={(val) =>
          onChange({ ...rule, operator: val as ConditionOperator })
        }
        placeholder="Operator"
        className="w-40 shrink-0"
        alphabetical={false}
        options={CONDITION_OPERATOR_OPTIONS}
      />

      {/* Value input */}
      <div className="min-w-[8rem] flex-1 basis-0">
        <ConditionFieldValueInput
          field={rule.field}
          operator={rule.operator}
          value={rule.value}
          onChange={(val) => onChange({ ...rule, value: val })}
        />
      </div>

      {/* Remove button */}
      <Button
        htmlType="button"
        type="text"
        className="shrink-0"
        onClick={onRemove}
        aria-label="Remove rule"
        iconName="x"
        iconSize="sm"
      />
    </div>
  )
}
