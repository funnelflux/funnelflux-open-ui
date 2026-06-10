import { useCallback, useState } from 'react'
import {
  Button,
  FormField,
  FormModal,
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  Input,
  Select,
} from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import { FUNNEL_URL_TOKEN_OPTIONS } from '@/lib/urlTokens'
import { customFieldsLinesToWire, customFieldsWireToLines } from '@/lib/pageCustomFields'

const TOKEN_PICKER_EMPTY = '__pick__'

const TOKEN_PICKER_OPTIONS: SelectOption[] = [
  { value: TOKEN_PICKER_EMPTY, label: 'Insert…' },
  ...FUNNEL_URL_TOKEN_OPTIONS.map((token) => ({ value: token, label: token })),
]

const CUSTOM_FIELDS_HELP =
  'Enter one custom field per line. You can then use the token {customfield-random} to insert one randomly into your URL.'

interface PageUrlTokensFieldProps {
  onTokenPick: (token: string) => void
  customFields?: string
  onCustomFieldsChange: (customFields: string | undefined) => void
}

export function PageUrlTokensField({
  onTokenPick,
  customFields,
  onCustomFieldsChange,
}: PageUrlTokensFieldProps) {
  const [tokenPickerValue, setTokenPickerValue] = useState(TOKEN_PICKER_EMPTY)
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false)
  const [customFieldsDraft, setCustomFieldsDraft] = useState('')

  const handleTokenPickerChange = useCallback(
    (value: string) => {
      if (!value || value === TOKEN_PICKER_EMPTY) return
      onTokenPick(value)
      setTokenPickerValue(TOKEN_PICKER_EMPTY)
    },
    [onTokenPick],
  )

  const openCustomFieldsModal = useCallback(() => {
    setCustomFieldsDraft(customFieldsWireToLines(customFields))
    setCustomFieldsOpen(true)
  }, [customFields])

  const closeCustomFieldsModal = useCallback(() => {
    setCustomFieldsOpen(false)
    setCustomFieldsDraft('')
  }, [])

  const confirmCustomFields = useCallback(() => {
    onCustomFieldsChange(customFieldsLinesToWire(customFieldsDraft))
    closeCustomFieldsModal()
  }, [closeCustomFieldsModal, customFieldsDraft, onCustomFieldsChange])

  return (
    <>
      <FormField
        label="URL Tokens"
        help="Pick a token to insert at the cursor in the URL field above."
      >
        <div className="flex max-w-full min-w-0 items-center gap-2">
          <Select
            className="min-w-0 flex-1"
            value={tokenPickerValue}
            onChange={handleTokenPickerChange}
            options={TOKEN_PICKER_OPTIONS}
            placeholder="Insert…"
            alphabetical={false}
          />
          <Button
            htmlType="button"
            type="default"
            size="md"
            className="shrink-0"
            title="Custom fields"
            iconName="plus"
            onClick={openCustomFieldsModal}
          />
        </div>
      </FormField>

      <FormModal open={customFieldsOpen} onCancel={closeCustomFieldsModal} destroyOnHidden width={520}>
        <FormModalHeader title="Custom fields" description={CUSTOM_FIELDS_HELP} />
        <FormModalBody>
          <Input.TextArea
            className="w-full resize-y font-mono text-sm"
            value={customFieldsDraft}
            onChange={(event) => setCustomFieldsDraft(event.target.value)}
            autoSize={{ minRows: 8 }}
            placeholder="One value per line"
          />
        </FormModalBody>
        <FormModalFooter>
          <Button htmlType="button" onClick={closeCustomFieldsModal}>
            Cancel
          </Button>
          <Button type="primary" htmlType="button" onClick={confirmCustomFields}>
            OK
          </Button>
        </FormModalFooter>
      </FormModal>
    </>
  )
}
