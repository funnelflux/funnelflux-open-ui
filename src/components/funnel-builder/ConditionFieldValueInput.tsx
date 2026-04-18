import { AntdSelect, Input } from '@/components/ui-kit'
import type { ConditionField, ConditionOperator } from '@/types/funnel'

interface ConditionFieldValueInputProps {
  field: ConditionField
  operator: ConditionOperator
  value: string | string[]
  onChange: (value: string | string[]) => void
}

const DAY_OF_WEEK_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, '0')}:00`,
}))

const DEVICE_TYPE_OPTIONS = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'other', label: 'Other' },
]

const CONNECTION_TYPE_OPTIONS = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'cellular', label: 'Cellular' },
  { value: 'wired', label: 'Wired' },
  { value: 'other', label: 'Other' },
]

const FIELD_PLACEHOLDERS: Partial<Record<ConditionField, string>> = {
  country: 'US, GB, DE',
  os: 'Windows, macOS, iOS, Android',
  browser: 'Chrome, Firefox, Safari',
  ip: '192.168.1.0/24',
}

function stringValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value
}

function arrayValue(value: string | string[]): string[] {
  return Array.isArray(value) ? value : value ? [value] : []
}

export function ConditionFieldValueInput({
  field,
  operator,
  value,
  onChange,
}: ConditionFieldValueInputProps) {
  // No value needed for exists/notExists operators
  if (operator === 'exists' || operator === 'notExists') {
    return null
  }

  // "between" operator: two inputs
  if (operator === 'between') {
    const parts = stringValue(value).split(',').map((s) => s.trim())
    const left = parts[0] ?? ''
    const right = parts[1] ?? ''

    return (
      <div className="flex items-center gap-1">
        <Input
          className="h-8 text-sm w-20"
          value={left}
          onChange={(e) => onChange(`${e.target.value}, ${right}`)}
          placeholder="min"
        />
        <span className="text-xs text-muted-foreground px-1">&mdash;</span>
        <Input
          className="h-8 text-sm w-20"
          value={right}
          onChange={(e) => onChange(`${left}, ${e.target.value}`)}
          placeholder="max"
        />
      </div>
    )
  }

  // "in" / "notIn" operators: textarea for multiple values
  if (operator === 'in' || operator === 'notIn') {
    const lines = arrayValue(value).join('\n')

    return (
      <Input.TextArea
        className="h-16 min-h-[4rem] text-sm resize-none"
        value={lines}
        onChange={(e) => {
          const vals = e.target.value.split('\n')
          onChange(vals)
        }}
        placeholder="One value per line"
      />
    )
  }

  // Field-specific select inputs
  if (field === 'dayOfWeek') {
    return (
      <AntdSelect
        value={stringValue(value) || undefined}
        onChange={(val) => onChange(val)}
        placeholder="Day"
        className="w-32"
        size="small"
        options={DAY_OF_WEEK_OPTIONS}
      />
    )
  }

  if (field === 'hourOfDay') {
    return (
      <AntdSelect
        value={stringValue(value) || undefined}
        onChange={(val) => onChange(val)}
        placeholder="Hour"
        className="w-28"
        size="small"
        options={HOUR_OPTIONS}
      />
    )
  }

  if (field === 'deviceType') {
    return (
      <AntdSelect
        value={stringValue(value) || undefined}
        onChange={(val) => onChange(val)}
        placeholder="Type"
        className="w-32"
        size="small"
        options={DEVICE_TYPE_OPTIONS}
      />
    )
  }

  if (field === 'connectionType') {
    return (
      <AntdSelect
        value={stringValue(value) || undefined}
        onChange={(val) => onChange(val)}
        placeholder="Type"
        className="w-32"
        size="small"
        options={CONNECTION_TYPE_OPTIONS}
      />
    )
  }

  // Default: text input
  return (
    <Input
      className="h-8 text-sm flex-1"
      value={stringValue(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={FIELD_PLACEHOLDERS[field] ?? 'Value'}
    />
  )
}
