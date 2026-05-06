import type { MetricScope } from '@/components/ui-kit/data-table/columnRegistry'
import { EntityPage } from '@/lib/entity-page/EntityPage'

/** Offer-source grids omit lander-scoped metrics (not meaningful for this entity). See selective metrics / drilldownMetrics. */
const OFFER_SOURCES_METRIC_HIDE_SCOPES = new Set<MetricScope>(['lander'])

export function OfferSourcesPage() {
  return <EntityPage metricHideScopes={OFFER_SOURCES_METRIC_HIDE_SCOPES} />
}
