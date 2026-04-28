import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import {
  Button,
  EmptyState,
  Input,
  PageShell,
  Tag,
  useToastApi,
  type InputRef,
} from '@/components/ui-kit'
import { useTags, useSaveTag, useUpdateTag } from '@/api/hooks/useTags'
import { getErrorMessage } from '@/lib/utils'

export function TagsPage() {
  const toast = useToastApi()
  const { data: tags, isLoading } = useTags()
  const saveTag = useSaveTag()
  const updateTag = useUpdateTag()

  const [inputValue, setInputValue] = useState('')
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const editInputRef = useRef<InputRef>(null)

  useEffect(() => {
    if (editingTagId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingTagId])

  function handleAddTags() {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    saveTag.mutate(trimmed, {
      onSuccess: () => {
        toast.success('Tags added')
        setInputValue('')
      },
      onError: (err) => {
        toast.error(`Failed to add tags: ${getErrorMessage(err)}`)
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTags()
    }
  }

  function startEditing(id: string, name: string) {
    setEditingTagId(id)
    setEditingValue(name)
  }

  function commitEdit() {
    if (!editingTagId) return
    const trimmed = editingValue.trim()
    if (!trimmed) {
      setEditingTagId(null)
      return
    }

    updateTag.mutate(
      { idTag: editingTagId, name: trimmed },
      {
        onSuccess: () => {
          toast.success('Tag renamed')
        },
        onError: (err) => {
          toast.error(`Failed to rename tag: ${getErrorMessage(err)}`)
        },
      },
    )
    setEditingTagId(null)
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    }
    if (e.key === 'Escape') {
      setEditingTagId(null)
    }
  }

  return (
    <PageShell title="Tags">
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter tag names (comma-separated)"
          className="max-w-md"
        />
        <Button
          type="primary"
          onClick={handleAddTags}
          disabled={!inputValue.trim() || saveTag.isPending}
        >
          <Icon name="plus" className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading tags...</p>
      )}

      {!isLoading && (!tags || tags.length === 0) && (
        <EmptyState
          icon={<Icon name="tags" className="h-10 w-10" />}
          message="No tags yet. Add some above."
        />
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div key={tag.id}>
              {editingTagId === tag.id ? (
                <Input
                  ref={editInputRef}
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                  className="h-7 w-32 text-xs"
                />
              ) : (
                <Tag
                  className="cursor-pointer hover:bg-secondary/60 text-sm py-1 px-3"
                  onClick={() => startEditing(tag.id, tag.name)}
                >
                  {tag.name}
                </Tag>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
