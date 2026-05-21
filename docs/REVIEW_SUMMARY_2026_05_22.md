# `funnelflux-open-ui` — Review Summary & Action Plan

> One-page version of the principal-engineer review. Date: 2026-05-22.

---

## Verdict in one line

**Strong codebase (~83/100).** Architecture, types, and conventions are excellent. The fix list is about **trimming god-files and refreshing onboarding docs** — not rescuing the codebase.

---

## Scorecard

| Area | Score | Notes |
|---|---|---|
| Architecture | 9/10 | Clean server/client state split, route registry, ui-kit boundary |
| Type safety | 9/10 | 0 `@ts-ignore`, ~1 `any` in 45k LOC |
| Testing | 7/10 | 176 tests, but mostly pure logic — UI/integration thin |
| Docs (maintainers) | 9/10 | CLAUDE.md + `.cursor/rules/` + `docs/_ai_context/` |
| Docs (newcomers) | 6/10 | README/CONTRIBUTING are out of date |
| Scalability of patterns | 8/10 | Entity-table engine + queryKeys + route registry scale linearly |
| Bundle perf | 7/10 | AntD vendor is 1.1 MB raw / 335 KB gzip — at the ceiling |
| Readability | 8/10 | Hurt by ~5 god-files |
| Newcomer ramp-up | 7/10 | Easy to add things, hard to modify the big files |

---

## What's great (don't change)

- Server data → React Query, client UI state → Zustand. Enforced, not just suggested.
- One central query-key factory at `src/api/queryKeys.ts`.
- `routeRegistry.tsx` drives routes, nav, permission guards, and default landing — all from one array.
- ui-kit boundary enforced by ESLint (`no-restricted-imports` blocks raw AntD outside `ui-kit/`).
- `entity-table` engine factors out list+drilldown+merge+sort+page into one reusable hook.
- OpenAPI → TS codegen with CI check (`pnpm check-generated-types`).
- Bigint-safe stats JSON (`api.postDrilldown`) — subtle prod bug avoided.
- Build/lint/test all green; 0 TODOs; 0 `@ts-ignore`.

---

## What's weak (the fix list)

### 5 god-files

| File | LOC | Action |
|---|---|---|
| `src/components/drilldown/DrilldownToolbar.tsx` | 991 | Split into state hook + 4 sub-components + exportCsv |
| `src/pages/campaigns/CampaignsPage.tsx` | 769 | Extract `useCampaignsController.ts` (matches existing controllers pattern) |
| `src/pages/reports/DrilldownTreePage.tsx` | 641 | Split lazy-expand + column visibility into helpers |
| `src/components/forms/PageForm.tsx` | 633 | Split per-tab subforms |
| `src/lib/routeRegistry.tsx` | 584 | Split per domain or add builder helpers |

### README / CONTRIBUTING are wrong

- Tell users `npm install` — repo is pinned to **pnpm 10.11.1**.
- Reference `src/components/ui/` — actual dir is `src/components/ui-kit/`.
- Omit `funnel-builder/`, `entity-table/`, `funnel-graph/`.

### Testing skewed

- 176 tests, almost all in `src/lib/**`.
- Missing: hook-level tests for `useCampaigns`/`usePages`/`useDrilldownReportQuery`.
- Missing: Playwright smoke for login, funnel canvas, drilldown.

### Bundle ceiling

- `antd-vendor`: 1.1 MB raw / 335 KB gzip.
- `codemirror-vendor`: 656 KB — verify it's only pulled by code-node modals.
- `chart-vendor` (Recharts): 388 KB — verify lazy-loaded.

### Small items

- `dist/` is committed inside the submodule. Confirm intentional.
- `package.json` version is `0.0.0`.
- Auth `permissions` shape is hand-typed (diverges from OpenAPI on purpose) — add a Zod runtime guard at the auth boundary.

---

## Do this — prioritized

### Sprint 1 (high ROI, low risk)

- [ ] **Update `README.md` and `CONTRIBUTING.md`** to say `pnpm`, fix `ui/` → `ui-kit/`, add the missing directories. _~1 hour. Highest ROI on the list._
- [ ] **Split `DrilldownToolbar.tsx`** into `DrilldownToolbar/{state.ts, HeaderFilters.tsx, ReportActions.tsx, ConfigPanel.tsx, exportCsv.ts, index.tsx}`. No behavior change. _~1 day._
- [ ] **Extract `useCampaignsController.ts`** from `CampaignsPage.tsx`, matching `useOfferSourcesController.ts` / `useTrafficSourcesController.ts` / `usePageEntitiesController.ts`. _~half day._

### This quarter

- [ ] **Split `routeRegistry.tsx`** by domain (or add `mainNavRoute`, `settingsRoute`, `sectionedRoute` helpers).
- [ ] **Add hook-level tests** for `useCampaigns`, `usePages`, `useDrilldownReportQuery` with `QueryClientProvider` + stubbed `api`. _~1–2 days._
- [ ] **Add 1–2 Playwright smokes**: login → open funnel → add node; run a drilldown report. _~1 day._
- [ ] **Bundle audit** with `vite-bundle-visualizer`. Confirm CodeMirror + Recharts are not in initial chunk. Lower CI thresholds in `scripts/check-bundle-size.mjs` to lock in current sizes.
- [ ] **Add Zod runtime parsing at auth boundary** (`src/schemas/apiBoundaries.ts`) for the `UserProfile.permissions` shape.

### Watch list

- [ ] Decide on committed `dist/` — keep + document, or gitignore.
- [ ] If ever publishing this as a package, set a real `version` in `package.json`.
- [ ] `useEntityTable` runs both engines per render with `enabled: false` on the inactive one. Fine today; revisit if the inactive engine grows.

---

## Suggested file layout for the DrilldownToolbar split

```
src/components/drilldown/DrilldownToolbar/
├── index.tsx              # provider + barrel exports
├── state.ts               # useDrilldownToolbarState + context + types
├── HeaderFilters.tsx      # date range + timezone + saved views
├── ReportActions.tsx      # Apply / Export / Save view button row
├── ConfigPanel.tsx        # groupings + filters drawer
└── exportCsv.ts           # pure function: request → CSV download
```

This is the single highest-impact refactor in the whole list.

---

## What "done" looks like

After Sprint 1 + this quarter:

- Score moves from **83 → ~92** on the same rubric.
- New engineers can ramp in 1 day instead of 2–3.
- The drilldown surface stops being the file everyone is afraid to touch.
- Regressions in API-hook flows get caught by tests instead of by users.
