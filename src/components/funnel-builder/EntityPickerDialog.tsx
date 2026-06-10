import { useMemo, useState } from 'react'
import { List } from '@/components/ui-kit'
import { Input, Modal } from '@/components/ui-kit'
import { usePages, useConditions, type ConditionListItem } from '@/api/hooks'
import { asArray } from '@/lib/utils'

export interface EntityPickerDialogProps {
  open: boolean
  onClose: () => void
  entityType: 'lander' | 'offer' | 'condition'
  onSelect: (entity: { id: string; name: string }) => void
}

const ENTITY_LABELS: Record<EntityPickerDialogProps['entityType'], string> = {
  lander: 'Lander',
  offer: 'Offer',
  condition: 'Condition',
}

export function EntityPickerDialog({
  open,
  onClose,
  entityType,
  onSelect,
}: EntityPickerDialogProps) {
  const pageType = entityType === 'lander' || entityType === 'offer' ? entityType : undefined

  const pagesQuery = usePages(pageType)
  const conditionsQuery = useConditions()

  const items = useMemo(() => {
    if (entityType === 'lander' || entityType === 'offer') {
      // Page list API returns `{ id, name }` (not always full Page objects).
      return asArray<Record<string, unknown>>(pagesQuery.data).map((p) => ({
        id: String(p.idPage ?? p.id ?? ''),
        name: String(p.pageName ?? p.name ?? ''),
      }))
    }
    return asArray<ConditionListItem>(conditionsQuery.data).map((c) => ({
      id: c.idCondition,
      name: c.conditionName,
    }))
  }, [entityType, pagesQuery.data, conditionsQuery.data])

  const label = ENTITY_LABELS[entityType]

  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    if (!search) return items
    const lower = search.toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(lower))
  }, [items, search])

  function handleSelect(item: { id: string; name: string }) {
    onSelect(item)
    setSearch('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={() => { setSearch(''); onClose() }}
      title={`Select ${label}`}
      footer={null}
      width={448}
      destroyOnHidden
    >
      <p className="text-sm text-muted-foreground mb-4">
        Choose an existing {label.toLowerCase()} to add to the funnel.
      </p>
      <Input
        placeholder={`Search ${label.toLowerCase()}s...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
        allowClear
      />
      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No {label.toLowerCase()}s found.
        </p>
      ) : (
        <List
          dataSource={filteredItems}
          size="small"
          style={{ maxHeight: 300, overflowY: 'auto' }}
          renderItem={(item) => (
            <List.Item
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleSelect(item)}
            >
              {item.name}
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
