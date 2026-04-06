import { useMemo, useState } from 'react'
import { Modal, Input, List } from 'antd'
import { usePages, useConditions, useCodeSnippets } from '@/api/hooks'

export interface EntityPickerDialogProps {
  open: boolean
  onClose: () => void
  entityType: 'lander' | 'offer' | 'condition' | 'jsCode' | 'phpCode'
  onSelect: (entity: { id: string; name: string }) => void
}

const ENTITY_LABELS: Record<EntityPickerDialogProps['entityType'], string> = {
  lander: 'Lander',
  offer: 'Offer',
  condition: 'Condition',
  jsCode: 'JavaScript Snippet',
  phpCode: 'PHP Snippet',
}

export function EntityPickerDialog({
  open,
  onClose,
  entityType,
  onSelect,
}: EntityPickerDialogProps) {
  const pageType = entityType === 'lander' || entityType === 'offer' ? entityType : undefined
  const snippetType =
    entityType === 'jsCode' ? 'javascript' : entityType === 'phpCode' ? 'php' : undefined

  const pagesQuery = usePages(pageType)
  const conditionsQuery = useConditions()
  const snippetsQuery = useCodeSnippets(snippetType)

  const items = useMemo(() => {
    if (entityType === 'lander' || entityType === 'offer') {
      return (pagesQuery.data ?? []).map((p) => ({ id: p.idPage, name: p.pageName }))
    }
    if (entityType === 'condition') {
      return (conditionsQuery.data ?? []).map((c) => ({ id: c.idCondition, name: c.conditionName }))
    }
    // jsCode or phpCode
    return (snippetsQuery.data ?? []).map((s) => ({ id: s.idSnippet, name: s.snippetName }))
  }, [entityType, pagesQuery.data, conditionsQuery.data, snippetsQuery.data])

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
