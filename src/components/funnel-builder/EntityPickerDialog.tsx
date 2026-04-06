import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { usePages, useConditions, useCodeSnippets } from '@/api/hooks'
import type { ConditionListRow } from '@/api/hooks/useConditions'
import type { CodeSnippetListRow } from '@/api/hooks/useCodeSnippets'
import { asArray } from '@/lib/utils'

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
      // Page list API returns `{ id, name }` (not always full Page objects).
      return asArray<Record<string, unknown>>(pagesQuery.data).map((p) => ({
        id: String(p.idPage ?? p.id ?? ''),
        name: String(p.pageName ?? p.name ?? ''),
      }))
    }
    if (entityType === 'condition') {
      return asArray<ConditionListRow>(conditionsQuery.data).map((c) => ({
        id: c.id,
        name: c.name,
      }))
    }
    // jsCode or phpCode — list API returns `{ id, name, codeType? }`
    return asArray<CodeSnippetListRow>(snippetsQuery.data).map((s) => ({
      id: s.id,
      name: s.name,
    }))
  }, [entityType, pagesQuery.data, conditionsQuery.data, snippetsQuery.data])

  const label = ENTITY_LABELS[entityType]

  function handleSelect(item: { id: string; name: string }) {
    onSelect(item)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Select {label}</DialogTitle>
          <DialogDescription>
            Choose an existing {label.toLowerCase()} to add to the funnel.
          </DialogDescription>
        </DialogHeader>
        <Command className="border-t">
          <CommandInput placeholder={`Search ${label.toLowerCase()}s...`} />
          <CommandList>
            <CommandEmpty>No {label.toLowerCase()}s found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item)}
                  className="cursor-pointer"
                >
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
