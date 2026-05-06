/**
 * Config types for {@link EntityPage} (flat entity grids).
 *
 * **Escape hatch:** Category-strip flows ({@link PageEntitiesPage}, {@link TrafficSourcesPage}),
 * drilldown trees, funnels/campaigns, and other non-tabular layouts stay bespoke — they compose
 * `PageShell`, `useEntityGrid` / `useEntityPage`, and DataTable directly instead of this runner.
 */

export interface EntityPageGridDefinition {
  queryKeyPrefix: readonly unknown[]
  listEndpoint: string
  groupBy: string
  archiveListFilter?: 'trafficsource' | 'status'
}
