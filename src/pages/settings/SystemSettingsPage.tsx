import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/Toaster'
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
  const toast = useToast()
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
            <Label htmlFor="forceHTTPS">Force HTTPS</Label>
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
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Default Home Page URL */}
        <div className="space-y-2">
          <Label htmlFor="defaultHomePageURL">Default Home Page URL</Label>
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
            <Label htmlFor="autoExpandCampaigns">Auto Expand Campaigns</Label>
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
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Offers Default Redirect */}
        <div className="space-y-2">
          <Label>Offers Default Redirect</Label>
          <Controller
            control={form.control}
            name="offersDefaultRedirect"
            render={({ field }) => (
              <Select
                value={field.value.type}
                onValueChange={(type) =>
                  field.onChange({ type, name: findRedirectName(type) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select redirect method" />
                </SelectTrigger>
                <SelectContent>
                  {REDIRECT_METHODS.map((method) => (
                    <SelectItem key={method.type} value={method.type}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Landers Default Redirect */}
        <div className="space-y-2">
          <Label>Landers Default Redirect</Label>
          <Controller
            control={form.control}
            name="landersDefaultRedirect"
            render={({ field }) => (
              <Select
                value={field.value.type}
                onValueChange={(type) =>
                  field.onChange({ type, name: findRedirectName(type) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select redirect method" />
                </SelectTrigger>
                <SelectContent>
                  {REDIRECT_METHODS.map((method) => (
                    <SelectItem key={method.type} value={method.type}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Min Confidence Rate */}
        <div className="space-y-2">
          <Label htmlFor="minConfidenceRateForWinners">
            Min Confidence Rate for Winners (%)
          </Label>
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
          <Label htmlFor="clickbankIPNKey">ClickBank IPN Key</Label>
          <Input
            id="clickbankIPNKey"
            {...form.register('clickbankIPNKey')}
            placeholder="Enter IPN key"
          />
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <Button type="submit" disabled={saveSettings.isPending}>
            {saveSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>

      <Separator className="my-8 max-w-2xl" />

      <div className="max-w-2xl">
        <DomainsManager />
      </div>
    </div>
  )
}
