import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export function ConditionRuleRow({ rule, onChange, onRemove }: ConditionRuleRowProps) {
  const needsExtraKey = EXTRA_KEY_FIELDS.includes(rule.field)

  return (
    <div className="flex items-start gap-2">
      {/* Field selector */}
      <Select
        value={rule.field}
        onValueChange={(val) =>
          onChange({ ...rule, field: val as ConditionField, value: '', extraKey: undefined })
        }
      >
        <SelectTrigger className="h-8 text-sm w-40 shrink-0">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_FIELDS.map((f) => (
            <SelectItem key={f} value={f}>
              {FIELD_LABELS[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Extra key input for visitorTag, queryParam, customField */}
      {needsExtraKey && (
        <Input
          className="h-8 text-sm w-24 shrink-0"
          value={rule.extraKey ?? ''}
          onChange={(e) => onChange({ ...rule, extraKey: e.target.value })}
          placeholder="Key"
        />
      )}

      {/* Operator selector */}
      <Select
        value={rule.operator}
        onValueChange={(val) =>
          onChange({ ...rule, operator: val as ConditionOperator })
        }
      >
        <SelectTrigger className="h-8 text-sm w-40 shrink-0">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_OPERATORS.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      <ConditionFieldValueInput
        field={rule.field}
        operator={rule.operator}
        value={rule.value}
        onChange={(val) => onChange({ ...rule, value: val })}
      />

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
