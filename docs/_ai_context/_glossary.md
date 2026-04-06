# Project Glossary

Domain-specific terms used in FunnelFlux. Update as new terms emerge.

| Term | Definition | Used in |
|------|-----------|---------|
| Campaign | Top-level entity that owns one or more funnels and a traffic source | `src/pages/campaigns/`, `src/schemas/campaign.ts` |
| Funnel | Directed graph of nodes and connections defining a visitor's path | `src/store/funnelEditor.ts`, `src/components/funnel-builder/` |
| Node | A vertex in a funnel graph — types: Root, Lander, Offer, Rotator, Condition, JsCode, PhpCode, ExternalUrl, VisitorTag | `src/components/funnel-builder/nodes/` |
| Connection | A directed edge between two nodes, with type-specific routing params (weights, actions, conditions) | `src/components/funnel-builder/edges/` |
| Lander | A landing page entity — the first page a visitor sees | `src/pages/landers/` |
| Offer | A monetizable destination page (affiliate offer, product, etc.) | `src/pages/offers/` |
| Traffic Source | Where traffic originates (ad network, social, email, etc.) — defines tracking parameters | `src/pages/traffic-sources/`, `src/schemas/trafficSource.ts` |
| Offer Source | The affiliate network or platform hosting offers | `src/pages/offer-sources/`, `src/schemas/offerSource.ts` |
| Rotator | A node that distributes traffic among its children by weight | `src/components/funnel-builder/nodes/RotatorNode.tsx` |
| Condition | A rule set that routes traffic based on visitor attributes (geo, device, time, etc.) | `src/components/funnel-builder/ConditionEditor.tsx`, `src/schemas/condition.ts` |
| Global Condition | A condition reusable across funnels (vs. local/inline conditions) | `src/pages/settings/GlobalConditionsPage.tsx` |
| Visitor Tag | A key-value label applied to visitors for segmentation and condition matching | `src/pages/settings/TagsPage.tsx` |
| Traffic Filter | Rules to block/allow traffic (bots, IPs, referrers, etc.) | `src/pages/settings/TrafficFiltersPage.tsx`, `src/schemas/trafficFilter.ts` |
| Drilldown Report | Analytics report that groups stats hierarchically (e.g. campaign > lander > offer) | `src/pages/reports/`, `src/store/drilldown.ts` |
| QuickView | Lightweight stats overlay for quick campaign performance checks | `src/pages/quickview/` |
| Heatmap | Visual overlay on funnel canvas showing click/conversion volumes per node | `src/components/funnel-builder/HeatmapOverlay.tsx` |
| System Links | Generated tracking URLs for a campaign + traffic source combination | `src/pages/links/SystemLinksPage.tsx` |
| Stored Links | Saved/named tracking link configurations | `src/pages/links/StoredLinksPage.tsx` |
| V2 API | REST API at `/admin/api/v2/` — the sole data source for this React UI | `src/api/client.ts`, `docs/api-specs/` |
| Design Tokens | CSS custom properties in `src/styles/design-tokens.css` — single source of truth for colors, spacing, typography | `src/styles/design-tokens.css` |
| UI Kit | Shared component library at `src/components/ui-kit/` — DataGrid, PageShell, FormField, etc. | `src/components/ui-kit/` |

## How to Use This File

When you encounter an unfamiliar term in the codebase:
1. Check this glossary first
2. If not listed, find its definition in code or documentation
3. Add it here for future reference

Keep definitions concise — one sentence per term. Include where the term
is primarily used (which module or directory).
