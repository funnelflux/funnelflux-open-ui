import { useEffect, useId, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  FormField,
  FormModal,
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  Input,
} from '@/components/ui-kit'
import { tagModalFormSchemaCreate, tagModalFormSchemaEdit } from '@/schemas/tag'
import type { Tag } from '@/types/entities'

export interface TagModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, modal is in edit mode (single name). */
  editingTag?: Tag | null
  onCreate: (commaSeparatedInput: string) => void
  onUpdate: (idTag: string, name: string) => void
  isSubmitting?: boolean
}

export function TagModal({
  open,
  onOpenChange,
  editingTag,
  onCreate,
  onUpdate,
  isSubmitting,
}: TagModalProps) {
  const isEdit = !!editingTag
  const schema = useMemo(() => (isEdit ? tagModalFormSchemaEdit : tagModalFormSchemaCreate), [isEdit])
  const formId = useId()

  const { control, handleSubmit, reset } = useForm<{ value: string }>({
    resolver: zodResolver(schema),
    defaultValues: { value: '' },
  })

  useEffect(() => {
    if (!open) return
    reset({ value: editingTag?.name ?? '' })
  }, [open, editingTag, reset])

  const handleClose = () => onOpenChange(false)

  return (
    <FormModal open={open} onCancel={handleClose} width={480} destroyOnHidden>
      <FormModalHeader title={isEdit ? 'Edit Visitor Tag' : 'Add Visitor Tags'} />
      <FormModalBody>
        <form
          id={formId}
          key={editingTag?.id ?? 'create'}
          onSubmit={handleSubmit((data) => {
            if (isEdit && editingTag) {
              onUpdate(editingTag.id, data.value.trim())
            } else {
              onCreate(data.value)
            }
          })}
        >
          <Controller
            control={control}
            name="value"
            render={({ field, fieldState }) => (
              <FormField
                label={isEdit ? 'Tag name' : 'Tag names (comma-separated)'}
                htmlFor="tag-modal-value"
                required
                error={fieldState.error?.message}
              >
                <Input
                  id="tag-modal-value"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  placeholder={isEdit ? 'Tag name' : 'e.g. vip, engaged, US-offer'}
                />
              </FormField>
            )}
          />
        </form>
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={handleClose} className="flex-1 sm:flex-none">
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          form={formId}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none"
          iconName={isSubmitting ? 'loader-2' : undefined}
          iconAnimation={isSubmitting ? 'spin' : 'none'}
          iconSize="sm"
        >
          {isEdit ? 'Save' : 'Add'}
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
