# FunnelFlux Open UI — Design System Audit (First Pass)

**Date:** 2026-08-22 · **Scope:** Token architecture, CSS/styling layers, spacing/sizing, typography, UI-kit primitives, and all major surfaces (entity tables, funnel builder canvas, dashboard, drilldown reports, settings/forms).
**Method:** Static read of `src/styles/design-tokens.css`, `src/index.css`, `src/lib/antd-theme.ts`, `src/lib/chart-theme.ts`, `src/components/ui-kit/**`, `src/lib/entity-table/**`, `src/pages/**`, plus repo-wide greps for hex literals, arbitrary Tailwind values, raw palette utilities, token consumption, and WCAG 2.1 contrast computations on token pairs. Read-only; no files changed.
**Companion pass:** Deep a11y/contrast math, focus/disabled/loading/empty states, and motion are owned by the second-opinion audit; this report flags token-level contrast only where it changes token decisions.

---

## 1. Executive Summary

FunnelFlux Open UI has a **real design system with genuine discipline**: a semantic CSS-variable layer with light/dark aliases, a clean Tailwind 4 `@theme inline` bridge, a well-enforced ui-kit barrel (zero direct `antd` imports in feature code), an excellent `EntityPage` scaffold that makes all table-first pages structurally identical, and the best-developed modal family (`Modal` layout variants + `FormModal` compound components) of any surface.

The system is **leaking at four seams**:

1. **The token graph has dead and broken edges.** 17 defined tokens have zero consumers (`--space-*`, `--shadow-card`, `--focus-ring`, …), while two *referenced* tokens were never defined (`--color-card` → dead `bg-card` classes on funnel nodes; `--surface-hover` → dead hover states in the column chooser). The funnel builder — the product's signature surface — is the main victim.
2. **Three hand-synced hex copies are drifting.** `design-tokens.css`, `antd-theme.ts`, and `chart-theme.ts` each hold a full palette copy; drift already exists (`#A855F7` vs `#8B5CF6` for the same series slot; two different `CHART_COLORS` exports). JS-side profit/loss colors ignore the dark-mode AA ramp that CSS enjoys.
3. **The funnel builder bypasses the token system entirely** — raw Tailwind palette gradients (`emerald/sky/violet/amber/rose/fuchsia`), raw edge strokes, hand-rolled context menus — while the rest of the app is token-clean.
4. **Several text/color pairs fail WCAG AA at the sizes actually used** — `text-xs` success/warning trends on white (3.30:1 / 3.19:1), white on the accent-orange CTA (3.56:1, 2.80:1 on hover), white on dark-mode `--primary` (3.68:1).
5. **Two measured interaction failures compound the token gaps** (second-opinion pass, re-verified here): the primary nav dropdown is keyboard-unreachable (`trigger={['hover']}` + `outline-none`, `Navbar.tsx:60`), and dark-mode DataTable row hover is a 1.00:1 no-op because `--surface-secondary` collapses to `--surface` — which also hides the hover-only row actions from keyboard users (no `:focus-within`).

### Design System Health Score

| Category | Score | Notes |
|---|---|---|
| Token architecture | 5.5 / 10 | Sound 3-layer model, but dead tokens, 2 broken references, triplicated hex |
| Color & theme coherence | 6.0 / 10 | Good light/dark aliases; raw-palette leakage in funnel builder; JS colors not dark-aware |
| Spacing & sizing rhythm | 6.5 / 10 | Control-height system is exemplary; spacing scale tokens unwired; arbitrary px scattered |
| Typography & hierarchy | 5.5 / 10 | No type scale; dual fonts; off-scale 10/11/15px sizes; AA failures at small sizes |
| Component coherence (ui-kit) | 7.5 / 10 | Strong wrappers & barrel; FormField bypass in settings; Tag/Badge unopinionated |
| Interactive states | 4.5 / 10 | Keyboard-unreachable primary nav; dead dark row hover; hover-only row actions; motion split (depth: 2nd pass) |
| Dark mode coherence | 7.0 / 10 | Algorithm + aliases + dark status ramps done right; charts/JS colors lag |
| Surface polish | 6.5 / 10 | Entity tables/dashboard strong; funnel builder weakest; drilldown toolbar crowded |
| **Overall** | **6.1 / 10** | **Solid foundation, leaking at the edges** |

---

## 2. Findings — Token System & CSS Architecture

### T-1 · Triplicated palette with live drift — **High**
`design-tokens.css` (CSS vars) ↔ `src/lib/antd-theme.ts:10-148` (hex) ↔ `src/lib/chart-theme.ts:8-62` (hex). The header comment in `design-tokens.css:5` acknowledges the duplication; nothing enforces sync. Drift already present:
- `chart-theme.ts:11` `conversions: '#A855F7'` (purple-500) vs `--ff-chart-2: #8B5CF6` (violet-500) in `design-tokens.css:41` and `antd-theme.ts:141`.
- Two different exports named `CHART_COLORS`: 10 colors in `antd-theme.ts:139-142`, 7 colors in `chart-theme.ts:18-26`. `PROFIT_COLOR`/`LOSS_COLOR` duplicated in both (`antd-theme.ts:147-148`, `chart-theme.ts:28-29`).

**Sync alone cannot fix the AntD copy.** `darkTheme` applies `theme.darkAlgorithm` (`antd-theme.ts:92`), which *transforms* the seed at runtime — verified against the installed antd: `colorPrimary #2563EB → #2257cb`, `colorError #DC2626 → #be2323`, `colorSuccess → #168e42`, `colorWarning → #bb6808`. So even a perfectly synced seed produces dark-mode colors that exist nowhere in the token graph. Two derived keys are actively harmful: `colorPrimaryBorder` (the global focus-outline color) resolves to `#192c55` = **1.07:1 on `--surface`** — focus rings are effectively invisible in dark mode — and `colorPrimary #2257cb` on `--surface` is 2.29:1 (white text on it is fine at 6.38:1, so filled buttons survive). Fix direction: explicitly override the derived keys used (`colorPrimaryBorder`, `colorPrimaryBg`, hover/active ramps) in `darkTheme`, or drop `darkAlgorithm` and map the full dark token set by hand from `design-tokens.css`. (Cross-referenced from the second-opinion pass; transform values re-verified here against the installed antd.)

### T-2 · 17 dead tokens — **Medium**
Defined but never consumed (grep-verified across `src/`): `--space-1…--space-16` (10 tokens, `design-tokens.css:62-71`), `--nav-height`, `--page-padding`, `--toolbar-height`, `--control-height` (`:74-78`), `--focus-ring` (`:109,139`), `--select-option-bg` (`:116,144`), `--shadow-card`, `--shadow-elevated` (`:110-111,140-141`). The spacing scale is documentation-only: Tailwind's default scale is used everywhere instead. `--control-height: 32px` actively conflicts with the real md tier (35px).

### T-3 · Broken token references (dead classes) — **Critical**
- `bg-card`, `bg-card/95`, `text-card-foreground` used in 6 files — `BaseNode.tsx:110`, `FunnelAdvancedSettings.tsx:244`, `FunnelQuickStatsModal.tsx:624`, `HeatmapOverlay.tsx:165,192,197`, `HeatmapNodeBadge.tsx:9,18`, `ConditionBlock.tsx:53` — but `--color-card` is **not** in the `@theme inline` map (`index.css:10-59`). Tailwind 4 emits nothing; these surfaces render with **transparent backgrounds** (shadcn-scaffold residue).
- `hover:bg-[var(--surface-hover)]` in `ColumnChooser.tsx:65,161` references undefined `--surface-hover` → **no hover feedback** on column-chooser rows.
- **Dark-mode row hover is a no-op on every DataTable.** `.dark` sets `--surface-secondary: var(--ff-gray-800)` (`design-tokens.css:123`), identical to `--surface` (`:122`). `data-table.css` `.dt-row:hover { background: var(--surface-secondary) }` therefore resolves to a 1.00:1 no-op in dark mode — row hover is dead on the app's densest surface. Related (second-opinion pass): `.dt-actions` is `opacity: 0` revealed only by `.dt-row:hover` with no `:focus-within` anywhere in the 706-line file — invisible to keyboard users in both themes.

### T-4 · Raw Tailwind palette leakage, concentrated in the funnel builder — **High**
- `nodes/BaseNode.tsx:9-23`: 8 accent gradients on raw `emerald/sky/violet/amber/rose/slate/fuchsia/orange` ramps; `:113` `ring-emerald-500/35`; `:159` `border-t-green-500`.
- `edges/ConditionEdge.tsx:91` raw `stroke-emerald-600/red-600`; `edges/CodeEdge.tsx:43,56-59` raw amber/yellow chip.
- `FunnelCanvas.tsx:331` canvas gradient `from-slate-950/[0.03] … to-violet-950/[0.04]`.
- `dashboard/DashboardTopTable.tsx:29-32` raw violet/red/emerald icon chips; `pages/funnels/FunnelEditorPage.tsx:410` `dark:text-amber-400`.
None of these colors exist in the token graph; they cannot be re-themed and were never contrast-vetted against canvas backgrounds.

### T-5 · Dark-mode status ramp invisible to JS — **High**
CSS dark mode re-ramps status/P&L colors for AA (`design-tokens.css:146-152`: `#22C55E/#F59E0B/#F87171`). All JS-consumed copies (`PROFIT_COLOR`, `LOSS_COLOR`, `CHART_TOOLTIP_STYLE`, `DASHBOARD_METRIC_STROKE`) hardcode the **light** hexes, so Recharts series, tooltips, and any JS-colored P&L render light-mode colors on dark surfaces (`#DC2626` on `#0F172A` ≈ 3.5:1 — the exact failure the CSS ramp was built to fix).

### T-6 · Layer confusion: component CSS inside the tokens file — **Medium**
`design-tokens.css:155-210` contains global AntD modal layout rules (max-height, flex, scroll body). `index.css:118-323` accumulates component patches (navbar, funnel controls, stat cards, archive toggle, drawer width). Tokens, base, and component overrides share files with no layer boundary; overrides use `!important` (`.ant-btn` box-shadow `index.css:301-303`, `.ff-form-modal .ant-modal-close` `:281-283`, drawer width `:286-289`).

### T-7 · Dead AntD Table theme config — **Low**
`antd-theme.ts:33-37` sets `Table.cellFontSize*` but AntD `Table` is never rendered in feature code (grep-verified); the real grid is the custom `DataTable` with its own 706-line `data-table.css`. Dead config misleads future theming work.

---

## 3. Findings — Spacing, Sizing & Grid Rhythm

### S-1 · Control-height system: exemplary, with one stale token — **Strength**
`src/lib/controlSize.ts` (sm/md/lg = 28/35/42) ↔ `--control-height-*` (`design-tokens.css:80-82`) ↔ `h-control-*` utilities (`index.css:63-96`) ↔ AntD `controlHeight` (`antd-theme.ts:20-22`) are kept in perfect sync; Button/Input/Select/DatePicker all normalize through `normalizeControlTier`. This is the model to replicate for other scales. Note: 35px md is off the 4px grid (deliberate density choice) and stale `--control-height: 32px` contradicts it.

### S-2 · Hardcoded 35px where the utility exists — **Low**
`drilldown/GroupingFilterPopover.tsx:266` and `UrlTrackingFieldPickerPopover.tsx:260` use `h-[35px]` instead of `h-control-md`.

### S-3 · Arbitrary toolbar widths, no layout tokens — **Medium**
`ReportActions.tsx:200` `w-[330px]` (datetime range), `:207` `w-[100px] !min-w-[100px]` (timezone), `:277` `w-[160px]` (saved views); `CategoryManager.tsx:389` `w-[220px]`; `DashboardPage.tsx:347` `w-[180px]`. The DateRangePicker compact width is overridden per page with the same magic value (`[--ff-date-range-compact-max:236px]` in `DashboardPage.tsx:342`, `OfferSourcesPage.tsx:135`, `TrafficSourcesPage.tsx:146`) — a de-facto standard never promoted to a preset.

### S-4 · Page padding & breakpoints off-token — **Medium**
`AppLayout.tsx:44` uses `p-4 min-[1600px]:p-6`; `--page-padding: 24px` is unused. Navbar switches at `min-[1400px]` (`Navbar.tsx:294,298`). Both breakpoints are outside the documented set (`design-tokens.css:84-85` declares sm–2xl, min 1024px desktop-first).

### S-5 · DataTable metrics internally consistent, 1px off the control grid — **Low**
Header 32px, rows 36px, cell padding `0 12px`, footer `6px 12px`, pagination 28px (`data-table.css:67,377,563,588`). Row 36px vs control-md 35px creates a subtle toolbar/grid misalignment. Fixed dashboard grid height 248px (`:21-26`) and `chartHeight={260}` / `min-h-[280px]` (`DashboardPage.tsx`) are un-tokenized magic numbers.

### S-6 · Modal sizing: two competing viewport caps — **Medium**
Global CSS caps non-centered modals at `calc(100dvh - 140px)` (`design-tokens.css:174`); `Modal.tsx:8` `SCROLL_BODY_STYLE` caps at `min(calc(100dvh - 6rem), 720px)`. FormModal caps width at 700px (`FormModal.tsx:8`); ColumnChooser drawer width is declared twice (`ColumnChooser.tsx:18` = 450 and `index.css:286-289` `min(450px, 100vw)`). Centered vs non-centered vs fullscreen behavior is spread across three layers.

### S-7 · Page rhythm varies by surface — **Low**
`PageShell` density offers `gap-3/gap-6` (`PageShell.tsx:39`), but Dashboard composes its own `mt-3`/`gap-4` grid and the funnel editor uses a compact custom header — three vertical rhythms.

---

## 4. Findings — Typography & Hierarchy

### TY-1 · Dual font system without a documented rule — **Medium**
Inter app-wide (`--font-sans`), Roboto in the data grid (`--font-grid`, `data-table.css:14`; loaded `main.tsx:5-10`, Roboto only 400/500). Two text voices in adjacent UI (toolbar in Inter directly above a Roboto grid) with no token-level rationale or fallback metric-matching.

### TY-2 · No type scale; off-scale arbitrary sizes — **Medium**
No font-size tokens exist. Verified off-scale usage: `text-[10px]` (`DashboardChart.tsx:105`, `ReportActions.tsx:236`, `InboxPage.tsx:154`), `text-[11px]` (`OfferSourceForm.tsx:304`, `BaseNode.tsx:144`, `SystemLinksPage.tsx:331`, `ColumnChooser.tsx:79`), `text-[15px]` (`DashboardTopTable.tsx:226`). Heading weights diverge: `LoginPage.tsx:6` `font-bold` vs `PageShell.tsx:75` `font-semibold`; funnel editor title is `text-sm/sm:text-base` (`FunnelEditorPage.tsx:404`) vs `text-2xl` elsewhere.

### TY-3 · WCAG AA failures at the sizes actually used — **High** (computed, WCAG 2.1 relative luminance)
| Pair | Ratio | Verdict |
|---|---|---|
| `text-success` `#16A34A` on white — StatCard trend at `text-xs` (`StatCard.tsx:55-63`) | 3.30:1 | **Fail AA** |
| `text-warning` `#D97706` on white | 3.19:1 | **Fail AA** |
| White on accent CTA `#EA580C` (`Button.tsx:78-80`) | 3.56:1 | **Fail AA** |
| White on accent hover `#F97316` | 2.80:1 | **Fail** (hover worse than rest) |
| White `primary-fg` on dark `--primary` `#3B82F6` (e.g. "On" badge `ReportActions.tsx:236`, `text-[10px]`) | 3.68:1 | **Fail AA** |
| `muted-fg` `#64748B` on `surface-sunken` `#F1F5F9` (light) | 4.34:1 | Marginal fail (4.5 needed) |
| `colorTextTertiary` `#64748B` on dark bg `#0F172A` | 3.75:1 | **Fail** if used for content |
| `colorTextQuaternary` `#94A3B8` on white | 2.56:1 | Placeholder-grade only |
| `text-error` `#DC2626` on white / `#F87171` on dark bg | 4.83 / 6.45 | Pass |
| Dark status ramp `#22C55E/#F59E0B/#F87171` on `#0F172A` | 7.83 / 8.31 / 6.45 | Pass — good work |

### TY-4 · Micro-label conventions inconsistent — **Low**
Uppercase tracking-wide labels appear at `text-[10px]`, `text-[11px]`, and `text-xs` across surfaces (`EdgeContextMenu.tsx:183-185`, `ColumnChooser.tsx:79`, `DashboardPage.tsx:361`) with three different size/weight combos for the same semantic role.

---

## 5. Findings — UI Kit Primitives & Component Coherence

### U-1 · Import discipline: verified clean — **Strength**
Zero direct `antd` imports in `src/pages` or feature components; everything flows through `@/components/ui-kit`. The barrel (`index.ts`) plus the `.ai/rules/open-ui-uikit-components.mdc` "Never" list is working.

### U-2 · Button: accent variant via `!important` utility soup; motion off — **Medium**
`Button.tsx:78-80` implements the accent CTA with six `!`-prefixed utilities — specificity debt that fights AntD's cascade. Meanwhile `antd-theme.ts:29-30` sets `motionDurationMid/Slow: '0s'` (buttons snap) while `data-table.css` and funnel controls animate at 150ms — two motion languages.

### U-3 · FormField bypassed on exactly the surfaces it was built for — **Medium**
`FormField` (label `mb-1.5`, error/help `mt-2 text-xs`) is well-designed, but `SystemSettingsPage.tsx:112-129` hand-rolls label+Switch rows, and the dashboard settings modal hand-rolls uppercase section labels (`DashboardPage.tsx:361,373,385`). Two form-labeling conventions coexist.

### U-4 · Tag/Badge are raw re-exports; preset colors leak — **Medium**
`Tag.tsx`/`Badge.tsx` add no semantics; feature code uses AntD preset props (`color="blue"` `InboxPage.tsx:154`, `UserManagementPage.tsx:119`) which are not token-driven and do not re-ramp in dark mode.

### U-5 · StatCard: solid, one contrast trap — **Low**
Compact/regular padding (12/20), tabular-nums, tone classes — good. Trend text inherits the TY-3 success/warning failure at `text-xs`.

### U-6 · Modal family: best primitive, three styling layers — **Strength w/ caveat**
`Modal` layout variants + `FormModal` compound components (header/body/field-grid/footer-submit) are the most complete pattern in the app. Caveat: styling is split across global CSS, `Modal.tsx` style objects, and `FormModal.tsx`, plus a `display:none !important` on the Ant close button (`index.css:281-283`).

### U-7 · Two empty-state patterns — **Low**
`EmptyState` (`py-16`, icon + CTA) vs `PageShell` bodyState empty (`min-h-[400px]`) — different footprints for the same concept.

### U-8 · LoginPage predates the kit — **Low**
Raw `<a>` styled as a button (`LoginPage.tsx:22-26`), `font-bold` h1, `bg-surface-secondary` page ground — all off-pattern.

### U-9 · Primary nav dropdown is keyboard-unreachable — **Critical** (cross-referenced from second-opinion pass)
`Navbar.tsx:60` `NavDropdown` uses `trigger={['hover']}` and its trigger button carries `outline-none` with no focus-visible replacement; the utility dropdowns at `:139/:186/:241` correctly use `trigger={['click']}` + `focus-visible:ring-2`. `@rc-component/trigger` binds `onMouseEnter` only for `'hover'` — `onClick`/`onFocus` are bound solely for `'click'`/`'focus'` triggers. Net: the entire primary section navigation cannot be reached or operated by keyboard, and shows no focus indicator. WCAG 2.1.1 (A) + 2.4.7 (AA). Fix: switch to `trigger={['click']}` (matching the sibling dropdowns) and restore a focus-visible ring.

---

## 6. Findings — Surface-by-Surface

### 6.1 Entity Tables & Category Strip — **Strong**
`EntityPage` (`src/lib/entity-table/EntityPage.tsx`) unifies PageShell + SearchToolbar + DataTable with persisted column sizing; Campaigns/TrafficSources/OfferSources/PageEntities are structurally identical. Category strip rows have dedicated styling (`dt-row--category-strip`), sticky header, pinned totals, and a 300ms-debounced `SearchToolbar`. Gaps: dead hover in ColumnChooser (T-3), duplicated drawer width (S-6), 36px rows vs 35px controls (S-5).

### 6.2 Funnel Builder Canvas — **Weakest surface**
- Dead `bg-card/95` on node cards (T-3) — nodes risk transparent backgrounds over the dotted canvas.
- Two node geometries in one file: card style `w-[220px] rounded-2xl` (`BaseNode.tsx:110`) vs simple `w-[180px] rounded-lg` (`:158`), with different selection rings (`ring-offset-2` vs `ring-offset-1`).
- Raw-palette accents/edges/canvas gradient (T-4); context menus are hand-rolled fixed-position divs (`CanvasContextMenu.tsx:174`, `EdgeContextMenu.tsx:157`) instead of the ui-kit `Dropdown`, duplicating shadow/border/radius decisions.
- Editor header is a bespoke compact bar (`FunnelEditorPage.tsx:397-437`) — acceptable for a tool surface, but it invents its own title scale and dirty-badge (`text-warning dark:text-amber-400`).
- Properties modals correctly use `FormModal` (`NodePropertiesModal.tsx`) — the canvas chrome, not the dialogs, is where the system breaks down.

### 6.3 Dashboard & Drilldown Reports — **Good, crowded toolbars**
Dashboard: `ff-analytics-panel`/`ff-stat-card` system with accent top-bars is cohesive; settings modal uses hand-rolled labels (U-3); metric toggles drop to `text-[10px]` (TY-2); chart colors drifted (T-1) and are not dark-aware (T-5). Drilldown: the toolbar stacks a 330px range picker, 100px timezone, 160px saved-views, filter popovers and actions (S-3) — functional but un-tokenized and wrap-prone; `DrilldownConfigPanel.tsx:89-92` styles tags with an inline `color-mix()` one-off.

### 6.4 Settings & Forms — **Inconsistent labeling**
`SystemSettingsPage` mixes `FormField` with hand-rolled rows (U-3); `max-w-2xl space-y-6` rhythm is fine; validation messages flow through `FormField error` correctly where used. FormModal-based dialogs (campaign editor, node editors) are uniform; the column-chooser and drilldown drawers each invent their own width/row hover treatments.

---

## 7. Recommendations

### Token standardizations
1. **Single-source the palette — and override the dark algorithm's derived keys.** Make one token manifest (TS or JSON) the source; generate/derive `antd-theme.ts` and `chart-theme.ts` from it (or extract from CSS vars at build). Add a CI assertion that the copies agree. Kill one of the duplicate `CHART_COLORS`/`PROFIT_COLOR` exports. In `darkTheme`, explicitly pin `colorPrimaryBorder`/`colorPrimaryBg`/hover-active ramps (or drop `darkAlgorithm`) — synced seeds are not enough because the algorithm re-derives dark colors at runtime (see T-1).
2. **Fix the broken references:** define `--color-card` + `--color-card-foreground` (map to `--surface`/`--foreground`) or migrate all 6 files to `bg-surface`; define `--surface-hover` or switch ColumnChooser rows to `hover:bg-muted`.
3. **Wire or delete the dead 17.** Promote `--space-*` into `@theme` spacing (or delete and document "Tailwind scale is the scale"); delete `--control-height` (32px), `--shadow-card`, `--shadow-elevated`, `--focus-ring`, `--select-option-bg` or consume them.
4. **Dark-aware JS colors.** Resolve chart/P&L colors from the active theme (a `useChartTheme()` hook keyed off `useThemeStore`) so Recharts follows the dark AA ramp.
5. **Contrast fixes at the token level — light mode is the failing theme, not dark.** Measured on `--surface`: light success `#16A34A` 3.30:1, warning `#D97706` 3.19:1, accent `#EA580C` 3.56:1, chart axis `#94A3B8` 2.56:1, revenue series `#22C55E` 2.28:1, clicks `#F97316` 2.80:1 — all FAIL; every dark counterpart passes (6.42–6.81:1). The dark ramps were hardened (`design-tokens.css:146-152`); the default light theme was never re-measured. Introduce light text-grade ramps — e.g. `--ff-success-text: #15803D` (≈4.6:1), `--ff-warning-text: #B45309` (≈4.6:1); darken the accent CTA to `#C2410C`-grade or use dark text (white on `#EA580C` is 3.56:1, unconditional in both themes — `Button.tsx:73-80`); re-pick light chart series/axis colors for AA; in dark mode keep `--primary` at blue-600 for filled elements or use blue-400 only for text.

### Component standardizations
6. Move Button `accent` to an AntD theme variant or a single CSS class; remove the six `!important` utilities. Pick one motion stance (recommend restoring ~120–150ms on buttons).
7. Adopt `FormField` (or a `FormRow` variant for label-left/control-right switch rows) in SystemSettings, AccountSettings, and the dashboard settings modal.
8. Ship semantic `Tag`/`Badge` wrappers (`variant="info|success|warning|error|neutral"`) and ban preset color props in feature code.
9. Unify empty states on `EmptyState` inside `PageShell` bodyState.
10. Add type-scale tokens (`--text-micro: 11px` etc.) and replace all `text-[10/11/15px]`.

### Layout standardizations
11. Replace `h-[35px]` with `h-control-md`; promote the 236px compact date-range width into `DateRangePicker density="compact"` itself.
12. Align DataTable row height to the control grid (35px or 36px — pick one, apply to both).
13. Consolidate modal viewport caps into `Modal.tsx` and remove the global CSS duplicates; single-source the column-chooser width.
14. Document the two custom breakpoints (1400/1600) as tokens or migrate to standard steps.

---

## 8. Phased Implementation Roadmap

**Phase 0 — Defects (quick wins, 1 subagent, ~1 day)**
- Define `--color-card(-foreground)` + `--surface-hover` (or migrate call sites). *Files: `index.css`, `design-tokens.css`, 6 funnel/condition files, `ColumnChooser.tsx`.*
- Dedupe `CHART_COLORS`/`PROFIT_COLOR`/`LOSS_COLOR`; fix `#A855F7` drift. *Files: `antd-theme.ts`, `chart-theme.ts`.*
- Delete dead AntD `Table` config. *File: `antd-theme.ts:33-37`.*
- Single-source column-chooser width. *Files: `ColumnChooser.tsx:18`, `index.css:286-289`.*
- Restore dark row hover: give `.dark` a distinct `--surface-secondary` (or point `.dt-row:hover` at a dedicated `--row-hover` token), and add `:focus-within` reveal for `.dt-actions`. *Files: `design-tokens.css:123`, `data-table.css`.*
- Pin `colorPrimaryBorder` (and sibling derived keys) in `darkTheme` so dark focus rings are visible. *File: `antd-theme.ts`.*
- Nav keyboard access: `Navbar.tsx:60` → `trigger={['click']}` + focus-visible ring (coordinate with second-opinion pass).

**Phase 1 — Token consolidation (1–2 subagents, ~2–3 days)**
- Token manifest + generation/sync test for the three theme files.
- Wire/delete dead tokens; spacing scale decision; shadow/focus-ring utilities.
- `useChartTheme()` dark-aware JS colors; **light-mode** text-grade status ramps + light chart series/axis re-pick (the failing theme); accent CTA contrast fix (both themes).
- Modal cap consolidation; layer split (tokens vs component patches out of `design-tokens.css`).

**Phase 2 — Component hardening (2 subagents, parallelizable, ~3 days)**
- *Subagent A:* Button accent variant, motion stance, semantic Tag/Badge, EmptyState unification, LoginPage cleanup.
- *Subagent B:* FormField/FormRow adoption across settings + dashboard settings modal; type-scale tokens; replace arbitrary font sizes and `h-[35px]`.

**Phase 3 — Surface polish (2 subagents, parallelizable, ~3–4 days)**
- *Subagent A (funnel builder):* token-ize node accents/edges/canvas gradient, unify node card geometry + selection rings, migrate context menus to ui-kit `Dropdown`, align dirty-badge with semantic tokens.
- *Subagent B (data surfaces):* drilldown toolbar layout system (tokenized widths, wrap behavior), DateRangePicker density presets, DataTable row/control grid alignment, dashboard magic heights.

**Phase 4 — Guardrails (ongoing)**
- ESLint/stylelint rules: no raw palette utilities, no `text-[Npx]`, no `style={{}}` colors in feature code; token-sync test in CI; extend `/design-system` page as the visual regression reference per phase.

---

*Audit basis: static analysis of the working tree on 2026-08-22. Contrast ratios computed per WCAG 2.1 relative luminance. Deep interactive-state, focus-ring, and motion verification deferred to the second-opinion audit.*
