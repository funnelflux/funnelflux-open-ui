import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@/components/ui-kit/icons'
import { Divider } from '@/components/ui-kit'
import { PageShell, useToastApi, Button, Input, Switch, Select } from '@/components/ui-kit'
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
  const { data: settings, isLoading } = useSystemSettings()
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

  if (isLoading) {
    return (
      <PageShell title="System Settings">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </PageShell>
    )
  }

  return (
    <PageShell title="System Settings">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl space-y-6"
      >
        {/* Force HTTPS */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="forceHTTPS" className="block text-sm font-medium text-foreground">Force HTTPS</label>
            <p className="text-xs text-muted-foreground">
              Redirect all HTTP traffic to HTTPS
            </p>
          </div>
          <Controller
            control={control}
            name="forceHTTPS"
            render={({ field }) => (
              <Switch
                id="forceHTTPS"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Default Home Page URL */}
        <Controller
          control={control}
          name="defaultHomePageURL"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="defaultHomePageURL" className="block text-sm font-medium text-foreground">Default Home Page URL</label>
              <Input
                id="defaultHomePageURL"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                placeholder="https://example.com"
              />
              {fieldState.error && (
                <p className="text-xs text-destructive">{fieldState.error.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Visitors to the root domain will be redirected here
              </p>
            </div>
          )}
        />

        {/* Auto Expand Campaigns */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="autoExpandCampaigns" className="block text-sm font-medium text-foreground">Auto Expand Campaigns</label>
            <p className="text-xs text-muted-foreground">
              Automatically expand campaign rows in the listing
            </p>
          </div>
          <Controller
            control={control}
            name="autoExpandCampaigns"
            render={({ field }) => (
              <Switch
                id="autoExpandCampaigns"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Offers Default Redirect */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Offers Default Redirect</label>
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
                options={REDIRECT_METHODS.map((method) => ({
                  value: method.type,
                  label: method.name,
                }))}
              />
            )}
          />
        </div>

        {/* Landers Default Redirect */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Landers Default Redirect</label>
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
                options={REDIRECT_METHODS.map((method) => ({
                  value: method.type,
                  label: method.name,
                }))}
              />
            )}
          />
        </div>

        {/* Min Confidence Rate */}
        <Controller
          control={control}
          name="minConfidenceRateForWinners"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="minConfidenceRateForWinners" className="block text-sm font-medium text-foreground">
                Min Confidence Rate for Winners (%)
              </label>
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
              {fieldState.error && (
                <p className="text-xs text-destructive">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        {/* ClickBank IPN Key */}
        <Controller
          control={control}
          name="clickbankIPNKey"
          render={({ field }) => (
            <div className="space-y-2">
              <label htmlFor="clickbankIPNKey" className="block text-sm font-medium text-foreground">ClickBank IPN Key</label>
              <Input
                id="clickbankIPNKey"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                placeholder="Enter IPN key"
              />
            </div>
          )}
        />

        {/* Save Button */}
        <div className="pt-2">
          <Button type="primary" htmlType="submit" disabled={saveSettings.isPending}>
            {saveSettings.isPending ? (
              <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icon name="save" className="mr-2 h-4 w-4" />
            )}
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
