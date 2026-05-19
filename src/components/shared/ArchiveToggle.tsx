import { Segmented } from '@/components/ui-kit'

export type ArchiveStatus = 'active' | 'archived' | 'all'

interface ArchiveToggleProps {
  value: ArchiveStatus
  onChange: (value: ArchiveStatus) => void
}

export function ArchiveToggle({ value, onChange }: ArchiveToggleProps) {
  return (
    <div className="inline-flex h-control-md shrink-0 items-center rounded-md bg-surface-sunken p-0.5">
      <Segmented
        value={value}
        onChange={(v) => onChange(v as ArchiveStatus)}
        options={[
          { label: 'Active', value: 'active' },
          { label: 'Archived', value: 'archived' },
          { label: 'All', value: 'all' },
        ]}
        size="middle"
        className="ff-archive-toggle text-xs"
      />
    </div>
  )
}
