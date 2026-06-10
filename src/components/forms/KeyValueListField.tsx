import { Button, Input } from '@/components/ui-kit'
import type { KeyValuePair } from '@/types/entities'

interface KeyValueListFieldProps {
  value: KeyValuePair[]
  onChange: (value: KeyValuePair[]) => void
  keyLabel?: string
  valueLabel?: string
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function KeyValueListField({
  value,
  onChange,
  keyLabel = 'Key',
  valueLabel = 'Value',
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueListFieldProps) {
  const addRow = () => onChange([...value, { key: '', value: '' }])

  const removeRow = (index: number) => {
    const next = value.filter((_, i) => i !== index)
    onChange(next)
  }

  const updateRow = (index: number, field: 'key' | 'value', val: string) => {
    const next = value.map((item, i) =>
      i === index ? { ...item, [field]: val } : item,
    )
    onChange(next)
  }

  return (
    <div className="min-w-0 space-y-2">
      {value.length > 0 && (
        <div className="hidden grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground sm:grid">
          <span>{keyLabel}</span>
          <span>{valueLabel}</span>
          <span className="w-8" />
        </div>
      )}
      {value.map((item, i) => (
        <div
          key={i}
          className="grid min-w-0 grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:border-0 sm:p-0"
        >
          <div className="min-w-0 space-y-1">
            <span className="text-xs text-muted-foreground sm:hidden">{keyLabel}</span>
            <Input
              value={item.key}
              onChange={(e) => updateRow(i, 'key', e.target.value)}
              placeholder={keyPlaceholder}
              className="min-w-0 text-sm"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-xs text-muted-foreground sm:hidden">{valueLabel}</span>
            <Input
              value={item.value}
              onChange={(e) => updateRow(i, 'value', e.target.value)}
              placeholder={valuePlaceholder}
              className="min-w-0 text-sm"
            />
          </div>
          <div className="flex justify-end sm:justify-center">
            <Button
              type="text"
              htmlType="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeRow(i)}
              aria-label="Remove row"
              iconName="trash-2"
              iconSize="sm"
            />
          </div>
        </div>
      ))}
      <Button htmlType="button" className="text-xs" onClick={addRow} iconName="plus" iconSize="sm">
        Add Row
      </Button>
    </div>
  )
}
