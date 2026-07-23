import { Button } from '@/components/ui-kit/Button'
import { useLicenseRevalidation } from '@/hooks/useLicenseRevalidation'
import { getSafeLicenseReason, licenseTimestampToMillis } from '@/lib/licenseState'
import type { LicenseStatus } from '@/types/api'

function formatLicenseTime(value: string | undefined): string | null {
  const milliseconds = licenseTimestampToMillis(value)
  if (milliseconds == null) return null
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function LicenseLockedPage({ license }: { license: LicenseStatus }) {
  const revalidate = useLicenseRevalidation()
  const nextCheckAt = formatLicenseTime(license.nextCheckAt)
  const graceUntil = formatLicenseTime(license.graceUntil)

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <main className="bg-surface w-full max-w-lg rounded-lg border border-border p-8 shadow-md text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive text-xl font-bold"
        >
          !
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">FunnelFlux access is locked</h1>
        <p className="text-sm text-muted-foreground">{getSafeLicenseReason(license)}</p>

        {nextCheckAt ? (
          <p className="mt-4 text-sm text-muted-foreground">
            The license will be checked again by {nextCheckAt}.
          </p>
        ) : null}

        {license.state === 'allowed_grace' && graceUntil ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Service verification is unavailable. Access remains available until {graceUntil}.
          </p>
        ) : null}

        <p className="mt-4 text-sm text-muted-foreground">
          Check the installation license and domain in the main FunnelFlux admin, or contact
          FunnelFlux support if you believe this is incorrect.
        </p>

        {revalidate.isError ? (
          <div role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            The license could not be revalidated. Please try again or contact support.
          </div>
        ) : null}

        <Button
          type="primary"
          className="mt-6"
          loading={revalidate.isPending}
          disabled={!license.canRevalidate}
          onClick={() => revalidate.mutate()}
        >
          Revalidate my license now
        </Button>

        {!license.canRevalidate ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Manual revalidation is not currently available for this license state.
          </p>
        ) : null}
      </main>
    </div>
  )
}
