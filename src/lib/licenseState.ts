import type { LicenseState, LicenseStatus } from '@/types/api'

/** Direct presentation of the backend's explicit authorization states. */
export function isLicenseAllowed(license: Pick<LicenseStatus, 'state'>): boolean {
  return license.state === 'allowed' || license.state === 'allowed_grace'
}

const SAFE_REASON_TEXT: Partial<Record<LicenseState | string, string>> = {
  locked: 'This FunnelFlux license is inactive or suspended.',
  wrong_domain: 'This installation is not licensed for the current domain.',
  verification_unavailable:
    'The license could not be verified and no valid offline grace period is available.',
  suspended: 'This FunnelFlux license has been suspended.',
  inactive: 'This FunnelFlux license is inactive.',
  expired: 'This FunnelFlux license has expired.',
}

export function getSafeLicenseReason(license: LicenseStatus): string {
  return (
    SAFE_REASON_TEXT[license.reasonCode.toLowerCase()] ??
    SAFE_REASON_TEXT[license.state] ??
    'FunnelFlux cannot currently grant access to this installation.'
  )
}

export function getLicenseRefreshDelay(license: LicenseStatus | undefined, now = Date.now()): number {
  const nextCheck = license?.nextCheckAt ? Number(license.nextCheckAt) * 1_000 : Number.NaN
  if (!Number.isFinite(nextCheck)) return 60_000
  return Math.min(60 * 60 * 1_000, Math.max(1_000, nextCheck - now))
}

export function licenseTimestampToMillis(value: string | undefined): number | null {
  if (!value) return null
  const milliseconds = Number(value) * 1_000
  return Number.isFinite(milliseconds) ? milliseconds : null
}
