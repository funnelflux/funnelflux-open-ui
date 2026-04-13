import { Plus, Trash2 } from 'lucide-react'
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
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
          <span>{keyLabel}</span>
          <span>{valueLabel}</span>
          <span className="w-8" />
        </div>
      )}
      {value.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            value={item.key}
            onChange={(e) => updateRow(i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="h-8 text-sm"
          />
          <Input
            value={item.value}
            onChange={(e) => updateRow(i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="h-8 text-sm"
          />
          <Button
            type="text"
            htmlType="button"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => removeRow(i)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          />
        </div>
      ))}
      <Button htmlType="button" size="small" className="h-8 text-xs" onClick={addRow}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add Row
      </Button>
    </div>
  )
}
