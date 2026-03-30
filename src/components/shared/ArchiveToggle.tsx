import { Segmented } from 'antd'

export type ArchiveStatus = 'active' | 'archived' | 'all'

interface ArchiveToggleProps {
  value: ArchiveStatus
  onChange: (value: ArchiveStatus) => void
}

export function ArchiveToggle({ value, onChange }: ArchiveToggleProps) {
  return (
    <Segmented
      value={value}
      onChange={(v) => onChange(v as ArchiveStatus)}
      options={[
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
        { label: 'All', value: 'all' },
      ]}
      size="small"
    />
  )
}
