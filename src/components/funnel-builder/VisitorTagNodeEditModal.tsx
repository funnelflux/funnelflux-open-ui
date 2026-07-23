import { useQueryClient } from '@tanstack/react-query'
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Button, Divider, Input, Select, FormModal, FormModalBody, FormModalFooter, FormModalHeader, useToastApi, type SelectOption } from '@/components/ui-kit'
import { queryKeys } from '@/api/queryKeys'
import { fetchTagList, useSaveTag, useTags } from '@/api/hooks'
import type { Tag } from '@/types/entities'
import {
  NODE_TYPE_LABELS,
  NODE_TYPES,
  normalizeVisitorTagParams,
  type FunnelFlowNode,
  type VisitorTagNodeParams,
} from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { getErrorMessage } from '@/lib/utils'

interface VisitorTagNodeEditModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

export type VisitorTagNodeEditorSubmitHandle = {
  submit: () => void
}

interface VisitorTagNodeEditorFormProps {
  canvasNode: FunnelFlowNode
  nodeId: string
  tagsList: Tag[] | undefined
  tagsLoading: boolean
}

/**
 * Mounted only while the modal is open (`open && canvasNode`).
 * **`key={nodeId}` on the parent resets state when editing a different node.**
 */
const VisitorTagNodeEditorForm = forwardRef<
  VisitorTagNodeEditorSubmitHandle,
  VisitorTagNodeEditorFormProps
>(function VisitorTagNodeEditorForm({ canvasNode, nodeId, tagsList, tagsLoading }, ref) {
  const toast = useToastApi()
  const qc = useQueryClient()
  const updateNodeData = useFunnelEditorStore((state) => state.updateNodeData)
  const saveTag = useSaveTag()

  const [label, setLabel] = useState(() => canvasNode.data.label ?? '')
  const [selectedTagId, setSelectedTagId] = useState(() =>
    normalizeVisitorTagParams(canvasNode.data.params as VisitorTagNodeParams).tagId,
  )
  const [selectedTagDisplayName, setSelectedTagDisplayName] = useState(() =>
    normalizeVisitorTagParams(canvasNode.data.params as VisitorTagNodeParams).tagName,
  )
  const [newTagName, setNewTagName] = useState('')

  const tagOptions = useMemo<SelectOption[]>(() => {
    const rows = tagsList ?? []
    return rows.map((tag: Tag) => ({
      value: tag.id,
      label: tag.name,
      searchId: tag.id,
    }))
  }, [tagsList])

  const persistTagDisplayName = useCallback(() => {
    const trimmedId = selectedTagId.trim()
    if (trimmedId === '') return ''
    const resolvedFromList = tagsList?.find((identifier) => identifier.id === trimmedId)?.name?.trim()
    if (resolvedFromList !== undefined && resolvedFromList !== '') return resolvedFromList
    return selectedTagDisplayName.trim()
  }, [selectedTagDisplayName, selectedTagId, tagsList])

  const handleApplyToStore = useCallback(() => {
    const trimmedTagId = selectedTagId.trim()
    updateNodeData(nodeId, {
      label,
      params: {
        tagId: trimmedTagId,
        tagName: trimmedTagId === '' ? '' : persistTagDisplayName(),
      },
    })
  }, [label, nodeId, persistTagDisplayName, selectedTagId, updateNodeData])

  useImperativeHandle(ref, () => ({ submit: handleApplyToStore }), [handleApplyToStore])

  const handleLabelChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLabel(event.target.value)
  }, [])

  const handleTagSelectChange = useCallback(
    (value: string | null) => {
      const nextId = String(value ?? '').trim()
      setSelectedTagId(nextId)
      const matchedOption = tagOptions.find((option) => option.value === nextId)
      setSelectedTagDisplayName(matchedOption?.label ?? '')
    },
    [tagOptions],
  )

  const handleNewTagNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewTagName(event.target.value)
  }, [])

  const handleCreateTag = useCallback(async () => {
    const name = newTagName.trim()
    if (name === '') {
      toast.warning('Enter a tag name')
      return
    }
    try {
      await saveTag.mutateAsync(name)
      const refreshedTags = await qc.fetchQuery({
        queryKey: queryKeys.tags.list(),
        queryFn: fetchTagList,
      })
      const created =
        refreshedTags.find((t) => t.name.trim().toLowerCase() === name.toLowerCase()) ??
        refreshedTags.find((t) => t.name === name)
      if (created) {
        setSelectedTagId(created.id)
        setSelectedTagDisplayName(created.name)
        setNewTagName('')
        toast.success('Tag created')
      } else {
        toast.success('Tag created — select it from the list')
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [newTagName, qc, saveTag, toast])

  const handleNewTagPressEnter = useCallback(() => {
    void handleCreateTag()
  }, [handleCreateTag])

  const handleAddTagClick = useCallback(() => {
    void handleCreateTag()
  }, [handleCreateTag])

  const createPending = saveTag.isPending

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 text-sm font-medium text-foreground">Label</div>
        <Input value={label} onChange={handleLabelChange} placeholder="Display name" />
      </div>

      <div>
        <div className="mb-1 text-sm font-medium text-foreground">Visitor tag</div>
        <Select
          allowClear
          placeholder={tagsLoading ? 'Loading tags…' : 'Select a tag'}
          options={tagOptions}
          value={selectedTagId.trim() !== '' ? selectedTagId : undefined}
          onChange={handleTagSelectChange}
          disabled={tagsLoading}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Choose a system tag applied to visitors at this funnel step.
        </p>
      </div>

      <Divider className="my-0" />

      <div>
        <div className="mb-1 text-sm font-medium text-foreground">Create new tag</div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newTagName}
            onChange={handleNewTagNameChange}
            placeholder="New tag name"
            className="min-w-[200px] flex-1"
            disabled={createPending}
            onPressEnter={handleNewTagPressEnter}
          />
          <Button htmlType="button" onClick={handleAddTagClick} disabled={createPending || newTagName.trim() === ''}>
            {createPending ? 'Adding…' : 'Add tag'}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates a visitor tag in Settings → Tags, then selects it here.
        </p>
      </div>
    </div>
  )
})

export function VisitorTagNodeEditModal({ nodeId, open, onClose }: VisitorTagNodeEditModalProps) {
  const editorFormSubmitRef = useRef<VisitorTagNodeEditorSubmitHandle | null>(null)

  const node = useFunnelEditorStore((state) =>
    nodeId ? state.nodes.find((canvasNodeCandidate) => canvasNodeCandidate.id === nodeId) : undefined,
  )

  const canEditVisitorTag =
    open &&
    !!node &&
    !!nodeId &&
    node.data.nodeType === NODE_TYPES.visitorTag

  const { data: tagsList, isLoading: tagsLoading } = useTags({
    enabled: canEditVisitorTag,
  })

  const handleModalConfirm = useCallback(() => {
    editorFormSubmitRef.current?.submit()
    onClose()
  }, [onClose])

  if (!node || node.data.nodeType !== NODE_TYPES.visitorTag) {
    return null
  }

  return (
    <FormModal open={open} onCancel={onClose} destroyOnHidden>
      <FormModalHeader title={`Edit ${NODE_TYPE_LABELS[NODE_TYPES.visitorTag]}`} />
      <FormModalBody>
        {canEditVisitorTag ? (
          <VisitorTagNodeEditorForm
            key={node.id}
            ref={editorFormSubmitRef}
            canvasNode={node}
            nodeId={node.id}
            tagsList={tagsList}
            tagsLoading={tagsLoading}
          />
        ) : null}
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="primary" htmlType="button" onClick={handleModalConfirm}>
          Apply
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
