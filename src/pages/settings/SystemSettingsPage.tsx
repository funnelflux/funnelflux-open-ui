import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Divider } from '@/components/ui-kit'
import { PageShell, useToastApi, Button, FormField, Input, Switch, Select, type PageShellBodyState } from '@/components/ui-kit'
import { useSystemSettings, useSaveSystemSettings } from '@/api/hooks/useSystemSettings'
import { DomainsManager } from '@/components/settings/DomainsManager'
import {
  systemSettingsSchema,
  type SystemSettingsFormData,
} from '@/schemas/systemSettings'
import type { RedirectMethod, SystemSettings } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

/** Matches V2 `RedirectMethod.method` / PHP `FluxAPI\v2\Models\RedirectMethod` (not legacy302/meta UI strings). */
const REDIRECT_METHODS: { type: RedirectMethod['method']; name: string }[] = [
  { type: '307', name: '307 Temporary Redirect' },
  { type: '301', name: '301 Permanent Redirect' },
  { type: 'umr', name: 'Ultimate Meta Refresh (UMR)' },
  { type: 'fluxify', name: 'Fluxify (reverse proxy)' },
]

const DEFAULT_FORM_REDIRECT: SystemSettingsFormData['offersDefaultRedirect'] = REDIRECT_METHODS[0]
const REDIRECT_METHOD_OPTIONS = REDIRECT_METHODS.map((method) => ({
  value: method.type,
  label: method.name,
}))

interface SettingsToggleRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <label htmlFor={id} className="block text-sm font-medium leading-5 text-foreground">
          {label}
        </label>
        <p className="text-xs leading-4 text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  )
}

function redirectApiToForm(
  value: RedirectMethod | undefined,
): SystemSettingsFormData['offersDefaultRedirect'] {
  if (!value?.method) return DEFAULT_FORM_REDIRECT
  const match = REDIRECT_METHODS.find((m) => m.type === value.method)
  return match ?? { type: value.method, name: value.method }
}

function formDataToSystemSettingsPayload(data: SystemSettingsFormData): Partial<SystemSettings> {
  return {
    forceHTTPS: data.forceHTTPS,
    defaultHomePageURL: data.defaultHomePageURL,
    autoExpandCampaigns: data.autoExpandCampaigns,
    offersDefaultRedirect: { method: data.offersDefaultRedirect.type as RedirectMethod['method'] },
    landersDefaultRedirect: { method: data.landersDefaultRedirect.type as RedirectMethod['method'] },
    minConfidenceRateForWinners: data.minConfidenceRateForWinners,
    clickbankIPNKey: data.clickbankIPNKey,
  }
}

export function SystemSettingsPage() {
  const toast = useToastApi()
  const { data: settings, isLoading, isError, error, refetch } = useSystemSettings()
  const saveSettings = useSaveSystemSettings()

  const { control, handleSubmit, reset } = useForm<SystemSettingsFormData>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      forceHTTPS: false,
      defaultHomePageURL: '',
      autoExpandCampaigns: false,
      offersDefaultRedirect: DEFAULT_FORM_REDIRECT,
      landersDefaultRedirect: DEFAULT_FORM_REDIRECT,
      minConfidenceRateForWinners: 95,
      clickbankIPNKey: '',
    },
  })

  useEffect(() => {
    if (!settings) return
    reset({
      forceHTTPS: settings.forceHTTPS ?? false,
      defaultHomePageURL: settings.defaultHomePageURL ?? '',
      autoExpandCampaigns: settings.autoExpandCampaigns ?? false,
      offersDefaultRedirect: redirectApiToForm(settings.offersDefaultRedirect),
      landersDefaultRedirect: redirectApiToForm(settings.landersDefaultRedirect),
      minConfidenceRateForWinners: settings.minConfidenceRateForWinners ?? 95,
      clickbankIPNKey: settings.clickbankIPNKey ?? '',
    })
  }, [settings, reset])

  function onSubmit(data: SystemSettingsFormData) {
    saveSettings.mutate(formDataToSystemSettingsPayload(data), {
      onSuccess: () => {
        toast.success('Settings saved')
      },
      onError: (err) => {
        toast.error(`Failed to save settings: ${getErrorMessage(err)}`)
      },
    })
  }

  function findRedirectName(type: string): string {
    return REDIRECT_METHODS.find((m) => m.type === type)?.name ?? type
  }

  const bodyState: PageShellBodyState = isLoading
    ? { status: 'loading' }
    : isError
      ? {
          status: 'error',
          message: getErrorMessage(error),
          onRetry: () => void refetch(),
        }
      : { status: 'ready' }

  return (
    <PageShell title="System Settings" bodyState={bodyState}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl space-y-6"
      >
        {/* Force HTTPS */}
        <Controller
          control={control}
          name="forceHTTPS"
          render={({ field }) => (
            <SettingsToggleRow
              id="forceHTTPS"
              label="Force HTTPS"
              description="Redirect all HTTP traffic to HTTPS"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Default Home Page URL */}
        <Controller
          control={control}
          name="defaultHomePageURL"
          render={({ field, fieldState }) => (
            <FormField
              label="Default Home Page URL"
              htmlFor="defaultHomePageURL"
              error={fieldState.error?.message}
              help="Visitors to the root domain will be redirected here"
            >
              <Input
                id="defaultHomePageURL"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                placeholder="https://example.com"
              />
            </FormField>
          )}
        />

        {/* Auto Expand Campaigns */}
        <Controller
          control={control}
          name="autoExpandCampaigns"
          render={({ field }) => (
            <SettingsToggleRow
              id="autoExpandCampaigns"
              label="Auto Expand Campaigns"
              description="Automatically expand campaign rows in the listing"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Offers Default Redirect */}
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">Offers Default Redirect</span>
          <Controller
            control={control}
            name="offersDefaultRedirect"
            render={({ field }) => (
              <Select
                value={field.value.type}
                onChange={(type) =>
                  field.onChange({ type, name: findRedirectName(type) })
                }
                className="w-full"
                placeholder="Select redirect method"
                options={REDIRECT_METHOD_OPTIONS}
              />
            )}
          />
        </div>

        {/* Landers Default Redirect */}
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">Landers Default Redirect</span>
          <Controller
            control={control}
            name="landersDefaultRedirect"
            render={({ field }) => (
              <Select
                value={field.value.type}
                onChange={(type) =>
                  field.onChange({ type, name: findRedirectName(type) })
                }
                className="w-full"
                placeholder="Select redirect method"
                options={REDIRECT_METHOD_OPTIONS}
              />
            )}
          />
        </div>

        {/* Min Confidence Rate */}
        <Controller
          control={control}
          name="minConfidenceRateForWinners"
          render={({ field, fieldState }) => (
            <FormField
              label="Min Confidence Rate for Winners (%)"
              htmlFor="minConfidenceRateForWinners"
              error={fieldState.error?.message}
            >
              <Input
                id="minConfidenceRateForWinners"
                type="number"
                min={0}
                max={100}
                value={field.value}
                onChange={(e) => {
                  const raw = e.target.value
                  field.onChange(raw === '' ? 0 : Number(raw))
                }}
                onBlur={field.onBlur}
              />
            </FormField>
          )}
        />

        {/* ClickBank IPN Key */}
        <Controller
          control={control}
          name="clickbankIPNKey"
          render={({ field }) => (
            <FormField label="ClickBank IPN Key" htmlFor="clickbankIPNKey">
              <Input
                id="clickbankIPNKey"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                placeholder="Enter IPN key"
              />
            </FormField>
          )}
        />

        {/* Save Button */}
        <div className="pt-2">
          <Button
            type="primary"
            htmlType="submit"
            disabled={saveSettings.isPending}
            iconName={saveSettings.isPending ? 'loader-2' : 'save'}
            iconAnimation={saveSettings.isPending ? 'spin' : 'none'}
          >
            Save Settings
          </Button>
        </div>
      </form>

      <Divider className="my-8 max-w-2xl" />

      <div className="max-w-2xl">
        <DomainsManager />
      </div>
    </PageShell>
  )
}
