import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { Button, Input, Switch, Select, Divider } from 'antd'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToastApi } from '@/components/ui-kit'
import { useSystemSettings, useSaveSystemSettings } from '@/api/hooks/useSystemSettings'
import { DomainsManager } from '@/components/settings/DomainsManager'
import {
  systemSettingsSchema,
  type SystemSettingsFormData,
} from '@/schemas/systemSettings'
import { getErrorMessage } from '@/lib/utils'

const REDIRECT_METHODS = [
  { type: '302', name: '302 Redirect' },
  { type: '301', name: '301 Redirect' },
  { type: 'meta', name: 'Meta Refresh' },
  { type: 'double-meta', name: 'Double Meta Refresh' },
]

export function SystemSettingsPage() {
  const toast = useToastApi()
  const { data: settings, isLoading } = useSystemSettings()
  const saveSettings = useSaveSystemSettings()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<SystemSettingsFormData>({
    resolver: zodResolver(systemSettingsSchema) as any,
    defaultValues: {
      forceHTTPS: false,
      defaultHomePageURL: '',
      autoExpandCampaigns: false,
      offersDefaultRedirect: { type: '302', name: '302 Redirect' },
      landersDefaultRedirect: { type: '302', name: '302 Redirect' },
      minConfidenceRateForWinners: 95,
      clickbankIPNKey: '',
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        forceHTTPS: settings.forceHTTPS,
        defaultHomePageURL: settings.defaultHomePageURL ?? '',
        autoExpandCampaigns: settings.autoExpandCampaigns,
        offersDefaultRedirect: settings.offersDefaultRedirect ?? { type: '302', name: '302 Redirect' },
        landersDefaultRedirect: settings.landersDefaultRedirect ?? { type: '302', name: '302 Redirect' },
        minConfidenceRateForWinners: settings.minConfidenceRateForWinners ?? 95,
        clickbankIPNKey: settings.clickbankIPNKey ?? '',
      })
    }
  }, [settings, form])

  function onSubmit(data: SystemSettingsFormData) {
    saveSettings.mutate(data, {
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
      <div>
        <PageHeader title="System Settings" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="System Settings" />

      <form
        onSubmit={(form.handleSubmit as any)(onSubmit)}
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
            control={form.control}
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
        <div className="space-y-2">
          <label htmlFor="defaultHomePageURL" className="block text-sm font-medium text-foreground">Default Home Page URL</label>
          <Input
            id="defaultHomePageURL"
            {...form.register('defaultHomePageURL')}
            placeholder="https://example.com"
          />
          <p className="text-xs text-muted-foreground">
            Visitors to the root domain will be redirected here
          </p>
        </div>

        {/* Auto Expand Campaigns */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="autoExpandCampaigns" className="block text-sm font-medium text-foreground">Auto Expand Campaigns</label>
            <p className="text-xs text-muted-foreground">
              Automatically expand campaign rows in the listing
            </p>
          </div>
          <Controller
            control={form.control}
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
            control={form.control}
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
            control={form.control}
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
        <div className="space-y-2">
          <label htmlFor="minConfidenceRateForWinners" className="block text-sm font-medium text-foreground">
            Min Confidence Rate for Winners (%)
          </label>
          <Input
            id="minConfidenceRateForWinners"
            type="number"
            min={0}
            max={100}
            {...form.register('minConfidenceRateForWinners')}
          />
          {form.formState.errors.minConfidenceRateForWinners && (
            <p className="text-xs text-destructive">
              {form.formState.errors.minConfidenceRateForWinners.message}
            </p>
          )}
        </div>

        {/* ClickBank IPN Key */}
        <div className="space-y-2">
          <label htmlFor="clickbankIPNKey" className="block text-sm font-medium text-foreground">ClickBank IPN Key</label>
          <Input
            id="clickbankIPNKey"
            {...form.register('clickbankIPNKey')}
            placeholder="Enter IPN key"
          />
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <Button type="primary" htmlType="submit" disabled={saveSettings.isPending}>
            {saveSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>

      <Divider className="my-8 max-w-2xl" />

      <div className="max-w-2xl">
        <DomainsManager />
      </div>
    </div>
  )
}
