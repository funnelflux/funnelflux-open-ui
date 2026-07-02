import { useCallback } from 'react'
import { CopyButton, FormField, Input, Switch } from '@/components/ui-kit'
import type { EntranceLinkBundle } from '@/types/ui'

const readonlySnippetClass =
  'font-mono text-xs flex-1 min-w-0 !bg-surface-sunken text-muted-foreground'

interface DirectTrackingLinkFieldsProps {
  bundle: EntranceLinkBundle | null
  embedParamsInScript: boolean
  onEmbedParamsInScriptChange: (value: boolean) => void
  loading?: boolean
}

export function DirectTrackingLinkFields({
  bundle,
  embedParamsInScript,
  onEmbedParamsInScriptChange,
  loading = false,
}: DirectTrackingLinkFieldsProps) {
  const directUrl = bundle?.urlPage ?? ''
  const trackingSnippet = embedParamsInScript
    ? bundle?.universalJsWithExtraParams ?? ''
    : bundle?.universalJs ?? ''

  const handleEmbedToggle = useCallback(
    (checked: boolean) => {
      onEmbedParamsInScriptChange(checked)
    },
    [onEmbedParamsInScriptChange],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-3 py-2">
        <div className="space-y-0.5">
          <span className="text-sm font-medium text-foreground">
            Embed traffic source &amp; URL params in script
          </span>
          <p className="text-xs text-muted-foreground">
            When enabled, the snippet includes traffic source and tracking URL parameters.
          </p>
        </div>
        <Switch checked={embedParamsInScript} onChange={handleEmbedToggle} />
      </div>

      <FormField label="Direct page URL">
        <div className="flex w-full min-w-0 items-center gap-2">
          <Input
            value={directUrl}
            readOnly
            placeholder={loading ? 'Generating…' : 'Select a page node and traffic source'}
            className={readonlySnippetClass}
          />
          <CopyButton value={directUrl} disabled={!directUrl} />
        </div>
      </FormField>

      <FormField label="Universal tracking script">
        <div className="flex w-full min-w-0 items-start gap-2">
          <Input.TextArea
            value={trackingSnippet}
            readOnly
            autoSize={{ minRows: 10, maxRows: 16 }}
            placeholder={loading ? 'Generating…' : 'Script will appear here'}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <CopyButton
            value={trackingSnippet}
            disabled={!trackingSnippet}
            className="shrink-0"
            aria-label="Copy script"
          />
        </div>
      </FormField>
    </div>
  )
}
