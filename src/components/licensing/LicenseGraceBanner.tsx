import { Button } from '@/components/ui-kit/Button'
import { useLicenseRevalidation } from '@/hooks/useLicenseRevalidation'
import { licenseTimestampToMillis } from '@/lib/licenseState'
import { useAuthStore } from '@/store/auth'

function formatGraceTime(value: string | undefined): string | null {
  const milliseconds = licenseTimestampToMillis(value)
  if (milliseconds == null) return null
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function LicenseGraceBanner() {
  const license = useAuthStore((state) => state.session?.license)
  const revalidate = useLicenseRevalidation()

  if (license?.state !== 'allowed_grace') return null

  const graceUntil = formatGraceTime(license.graceUntil)

  return (
    <aside
      role="status"
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-foreground"
    >
      <div>
        <span className="font-semibold">License service outage:</span>{' '}
        FunnelFlux is running under its signed offline grace period
        {graceUntil ? ` until ${graceUntil}` : ''}.
        {revalidate.isError ? ' The latest manual retry failed.' : ''}
      </div>
      <Button
        size="sm"
        loading={revalidate.isPending}
        disabled={!license.canRevalidate}
        onClick={() => revalidate.mutate()}
      >
        Retry license check
      </Button>
    </aside>
  )
}
