# Codex Task List

Work through these tasks sequentially. Update `docs/PROGRESS.md` as each task completes.

**Pattern references** — before starting, read these files to understand established patterns:
- `src/api/hooks/useFunnels.ts` — hook pattern (useQuery/useMutation)
- `src/api/hooks/useDrilldown.ts` — reporting hooks
- `src/api/queryKeys.ts` — query key factory
- `src/schemas/campaign.ts` — Zod schema pattern
- `src/components/shared/DataTable.tsx` — table component
- `src/components/shared/TreeDataTable.tsx` — tree table with async expand
- `src/components/drilldown/DrilldownToolbar.tsx` — toolbar pattern
- `src/pages/campaigns/CampaignsPage.tsx` — full entity page pattern
- `src/store/drilldown.ts` — Zustand store pattern

---

## B.1 Drilldown Tree — Lazy-load Children

**Files to modify:** `src/pages/reports/DrilldownTreePage.tsx`

**Description:** Wire the `onExpandRow` callback so that clicking a row's expand button fetches child data from the drilldown API.

**Steps:**
1. In `DrilldownTreePage.tsx`, implement the `onExpandRow` handler
2. When a row expands, build a child drilldown request:
   - Keep the same timeRange, timeZone, and columnFilters from the current request
   - Add the parent row as a `topLevelFilters` entry (e.g., `{ groupBy: currentGrouping, whitelistFilters: [parentRowId] }`)
   - Use the next grouping level from `groupings` array
3. Call `useDrilldownReport().mutateAsync()` with the child request
4. Insert returned rows as children of the expanded row in local state
5. `TreeDataTable` already renders loading spinners during async expand — just return a Promise

**Acceptance criteria:**
- Expanding a row fetches and displays child rows indented one level
- Expanding works for all grouping levels up to the configured depth
- Loading spinner shows while child rows load
- Collapsing a row hides (but caches) its children

---

## B.2 CSV Export Button

**Files to modify:** `src/components/drilldown/DrilldownToolbar.tsx`
**Files to read:** `src/api/hooks/useDrilldown.ts` (useExportCsv hook already exists)

**Description:** Add an Export CSV button to the drilldown toolbar.

**Steps:**
1. Import `useExportCsv` from hooks
2. Add a `Download` icon button to the right side of `DrilldownToolbar`
3. On click, call `exportCsv.mutateAsync()` with current drilldown request params
4. Handle the Blob response: create a temporary `<a>` element, set href to `URL.createObjectURL(blob)`, trigger download with filename `drilldown-export-{timestamp}.csv`
5. Show loading state on button during export

**Acceptance criteria:**
- Button visible in toolbar with Download icon (from lucide-react)
- Clicking triggers CSV download with current report data
- Button shows spinner during export
- Works on both Tree and Flat drilldown pages (toolbar is shared)

---

## B.5 Server-side Sorting

**Files to modify:** `src/pages/reports/DrilldownTreePage.tsx`, `src/pages/reports/DrilldownFlatPage.tsx`

**Description:** Enable server-side sorting so clicking column headers re-fetches data sorted by that column.

**Steps:**
1. Add `manualSorting={true}` prop to DataTable/TreeDataTable in both pages
2. Track sorting state in component (column index + direction)
3. On sort change callback, update the sorting state and re-issue the drilldown request with `sorting: { column: idx, direction: 'asc'|'desc' }` in the request body
4. Map TanStack table's sortingState to the API's column index format

**Acceptance criteria:**
- Clicking a column header fetches fresh data sorted by that column
- Sort direction toggles between asc/desc
- Active sort column shows visual indicator
- Works on both Tree and Flat pages

---

## B.3 Saved Views

**Files to create:** `src/api/hooks/useSavedViews.ts`
**Files to modify:** `src/components/drilldown/DrilldownToolbar.tsx`

**Description:** Allow users to save and load report configurations (groupings, date range, filters).

**Steps:**
1. Create `src/api/hooks/useSavedViews.ts`:
   - `useSavedViews()` — useQuery to GET `/data/reporting/views/list/`
   - `useSaveView()` — useMutation to POST `/data/reporting/views/save/`
   - `useDeleteView()` — useMutation to DELETE `/data/reporting/views/delete/`
2. Add query key `savedViews` to `src/api/queryKeys.ts`
3. Export from `src/api/hooks/index.ts`
4. In `DrilldownToolbar.tsx`:
   - Add a Select dropdown for saved views (left of Apply button)
   - Add Save (floppy disk icon) and Delete (trash icon) buttons
   - On load: apply view's groupings, dateRange, timezone to drilldown store
   - On save: prompt for name, save current settings as a view

**Acceptance criteria:**
- Dropdown lists saved views
- Selecting a view applies its settings and triggers a report refresh
- Save button saves current settings with a name
- Delete button removes selected view
- Changes persist across sessions (server-side)

---

## B.4 Whitelist/Blacklist Filter UI

**Files to create:** `src/components/drilldown/GroupingFilterPopover.tsx`
**Files to modify:** `src/components/drilldown/GroupingsCascade.tsx`, `src/store/drilldown.ts`

**Description:** Add per-grouping whitelist/blacklist filtering.

**Steps:**
1. Extend `DrilldownState` in `src/store/drilldown.ts`:
   - Add `groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>`
   - Add `setGroupingFilter(level, type, values)` action
2. Create `GroupingFilterPopover.tsx`:
   - Filter icon button next to each grouping dropdown
   - Popover with two tabs: Whitelist / Blacklist
   - Multi-select text input (comma-separated or newline-separated IDs)
   - Apply/Clear buttons
3. In `GroupingsCascade.tsx`, render the filter icon for each grouping level
4. When building drilldown requests, include whitelist/blacklist from store in each grouping's `whitelistFilters`/`blacklistFilters` arrays

**Acceptance criteria:**
- Filter icon appears next to each grouping dropdown
- Clicking opens popover with whitelist/blacklist tabs
- Applied filters are included in drilldown API requests
- Active filter shows a visual indicator (badge/dot on icon)
- Filters persist in drilldown store

---

## B.6 Dashboard Widget Grid

**Files to modify:** `src/pages/DashboardPage.tsx`
**Files to read:** `src/components/dashboard/DashboardTable.tsx`

**Description:** Add a 2x2 widget grid below the chart showing top entities.

**Steps:**
1. In `DashboardPage.tsx`, add 4 `DashboardTable` instances below the chart
2. Each widget makes a separate drilldown call grouped by:
   - Top Funnels (`Element: Funnel`)
   - Top Traffic Sources (`Element: Traffic Source`)
   - Top Landers (`Element: Lander`)
   - Top Offers (`Element: Offer`)
3. Layout: 2-column grid on desktop, 1-column on mobile
4. Each table shows top 5 rows by visits
5. On row click: navigate to `/quickview?groupBy={type}&id={rowId}`

**Acceptance criteria:**
- 4 widget tables render below the chart in a 2x2 grid
- Each widget fetches and displays its own data
- Row click navigates to QuickView
- Loading skeletons while data loads
- Responsive: 1 column on small screens

---

## B.7 Live Stats Polling

**Files to modify:** `src/pages/DashboardPage.tsx`

**Description:** Auto-refresh dashboard data every 30 seconds with a toggle.

**Steps:**
1. Add a `isAutoRefresh` state (default: true)
2. Add a toggle button with RefreshCw icon in the dashboard header
3. Use `setInterval` (or react-query's refetchInterval) to reload dashboard every 30s when enabled
4. On data change, briefly highlight changed values with a subtle CSS animation (opacity pulse)
5. Show "Live" indicator when auto-refresh is active

**Acceptance criteria:**
- Toggle button enables/disables auto-refresh
- Data refreshes every 30 seconds when enabled
- Visual indicator shows auto-refresh is active
- Changed values get a brief highlight animation
- Disabling stops the polling

---

## B.8 QuickView Page

**Files to create:** `src/pages/quickview/QuickViewPage.tsx`
**Files to modify:** `src/App.tsx` (add route)

**Description:** Create a quick entity detail view accessible via URL params.

**Steps:**
1. Create `src/pages/quickview/QuickViewPage.tsx`:
   - Read `groupBy` and `id` from URL search params
   - Display entity name at top
   - 3 groups of report type toggle buttons:
     - Group 1: By Day, By Hour, By Day of Week, By Month
     - Group 2: By Campaign, By Funnel, By Lander, By Offer, By Traffic Source
     - Group 3: By Country, By Device, By Browser, By OS
   - Filter bar with date range + timezone
   - Stats table that re-fetches when report type changes
   - "Open in Drilldown" button → navigates to reports/tree with appropriate filters
2. Route: `/quickview` in App.tsx

**Acceptance criteria:**
- Page renders at `/quickview?groupBy=X&id=Y`
- Report type buttons switch the drilldown grouping
- Stats table updates on type change
- "Open in Drilldown" navigates correctly
- Date range and timezone selectors work

---

## C.3 System Links Cascade Wizard

**Files to modify:** `src/pages/links/SystemLinksPage.tsx`
**Files to read:** `src/api/hooks/useSystemLinks.ts`

**Description:** Enhance the system links page with a step-by-step cascade for generating tracking URLs.

**Steps:**
1. After campaign → funnel selection, add a Node picker dropdown
   - Fetch funnel nodes from the selected funnel
   - Show dropdown of available nodes (landers, offers)
2. Add three output sections below the cascade:
   - **Universal JS**: JavaScript snippet for the selected page
   - **Action Click URLs**: Table of action URLs with numbered rows + copy buttons
   - **Conversion Postback URLs**: Postback URL with token placeholders
3. Each URL output gets a copy-to-clipboard button (use `navigator.clipboard.writeText`)

**Acceptance criteria:**
- Campaign → Funnel → Node cascade selection works
- JS snippet, action URLs, and postback URLs display correctly
- Copy buttons work
- Changing any selection updates downstream options and outputs

---

## C.7 Template Integration

**Files to modify:** `src/components/forms/TrafficSourceForm.tsx`, `src/components/forms/OfferSourceForm.tsx`
**Files to read:** `src/api/hooks/useTrafficSources.ts` (templates query key exists)

**Description:** Add "Copy from template" functionality to traffic source and offer source forms.

**Steps:**
1. In both forms, add a "Copy from Template" dropdown at the top
2. Fetch templates from the existing template endpoints:
   - Traffic sources: GET `/data/traffic-source/templates/`
   - Offer sources: GET `/data/offer-source/templates/`
3. On template select: populate all form fields with template data using `form.reset(templateData)`
4. Use existing `templates` query key in `queryKeys.ts`

**Acceptance criteria:**
- Dropdown appears in both forms showing available templates
- Selecting a template fills all form fields
- User can still modify fields after template is applied
- Templates only show in "create new" mode

---

## C.5 Category Management

**Files to create:** `src/components/shared/CategoryManager.tsx`, `src/api/hooks/useCategories.ts`
**Files to modify:** `src/pages/landers/LandersPage.tsx`, `src/pages/offers/OffersPage.tsx`, `src/pages/traffic-sources/TrafficSourcesPage.tsx`

**Description:** Reusable category sidebar/filter for organizing entities.

**Steps:**
1. Create `src/api/hooks/useCategories.ts`:
   - `useCategories(entityType)` — GET `/data/categories/list/` with type param
   - `useSaveCategory()` — POST `/data/categories/save/`
   - `useDeleteCategory()` — DELETE `/data/categories/delete/`
   - Add `categories` key to `src/api/queryKeys.ts`
   - Export from `src/api/hooks/index.ts`
2. Create `CategoryManager.tsx`:
   - Sidebar-style component (can also be a dropdown filter)
   - "All" option + list of categories
   - Add/edit/delete category buttons
   - Click to filter entities by category
3. Integrate into Landers, Offers, Traffic Sources pages:
   - Add CategoryManager to the left side or as a dropdown filter
   - Filter displayed entities by selected category

**Acceptance criteria:**
- Category list displays for each entity type
- Selecting a category filters the table
- CRUD operations work for categories
- "All" shows everything
- Works on Landers, Offers, and Traffic Sources pages

---

## C.6 CSV Import

**Files to create:** `src/components/shared/CsvImportDialog.tsx`
**Files to modify:** `src/pages/landers/LandersPage.tsx`, `src/pages/offers/OffersPage.tsx`

**Description:** Import entities from CSV files.

**Steps:**
1. Create `CsvImportDialog.tsx`:
   - Dialog with file upload zone (drag-and-drop + click to browse)
   - Parse CSV on client side (first row = headers)
   - Preview table showing parsed rows with column mapping
   - Import button to submit parsed data
   - Progress indicator during import
   - Error/success summary after import
2. Add "Import CSV" button to Landers and Offers pages (in PageHeader actions)
3. On import: POST each row to the existing save endpoint

**Acceptance criteria:**
- File upload accepts .csv files
- Preview shows parsed data before import
- Column headers are mapped to entity fields
- Import creates entities and shows results
- Error handling for malformed CSV

---

## C.1 Campaigns Tree Hierarchy

**Files to modify:** `src/pages/campaigns/CampaignsPage.tsx`
**Files to read:** `src/components/shared/TreeDataTable.tsx`

**Description:** Refactor campaigns page to show campaign → funnel hierarchy using TreeDataTable.

**Steps:**
1. Replace `DataTable` with `TreeDataTable` in CampaignsPage
2. Top level: campaigns (from current drilldown with `['Element: Campaign']`)
3. On expand: fetch funnels for that campaign using a drilldown request with `['Element: Campaign', 'Element: Funnel']` and the campaign as a top-level filter
4. Per-funnel row actions: Edit (→ funnel editor), Clone, Move, Delete
5. Per-campaign row: "Add Funnel" button in actions menu

**Acceptance criteria:**
- Campaigns display in expandable tree rows
- Expanding shows funnels under each campaign
- Funnel-level actions work (Edit opens funnel editor route)
- "Add Funnel" creates a new funnel under the campaign
- Stats display at both campaign and funnel level

---

## C.8 Bulk Operations

**Files to create:** `src/components/shared/BulkActionsBar.tsx`
**Files to modify:** `src/pages/landers/LandersPage.tsx`, `src/pages/offers/OffersPage.tsx`, `src/pages/traffic-sources/TrafficSourcesPage.tsx`

**Description:** Bulk actions bar that appears when rows are selected.

**Steps:**
1. Create `BulkActionsBar.tsx`:
   - Sticky bar at bottom of page
   - Shows count of selected items
   - Action buttons: Archive, Delete, Move to Category
   - Confirmation dialog before destructive actions
   - "Select All" / "Deselect All" buttons
2. Enable row selection in DataTable for target pages
3. Wire bulk actions to appropriate API endpoints (loop through selected IDs)

**Acceptance criteria:**
- Bar appears when 1+ rows are selected
- Archive/Delete/Move actions work on all selected rows
- Confirmation dialog before destructive actions
- Bar disappears when no rows selected
- Success toast after bulk operation completes

---

## C.4 User Permissions Matrix

**Files to create:** `src/pages/settings/UserEditPage.tsx`, `src/components/settings/PermissionsGrid.tsx`
**Files to modify:** `src/pages/settings/UserManagementPage.tsx`, `src/App.tsx`
**Files to read:** `src/types/api.ts` (Permissions interface)

**Description:** User edit page with permissions management grid.

**Steps:**
1. Create `PermissionsGrid.tsx`:
   - Grid of toggles matching the `Permissions` interface structure
   - Sections: Stats, Campaigns, Traffic Sources, Offer Sources, Offers, Landers, System Links, Stored Links, Traffic Filters, Data Updates, System Updates
   - Per-section: enabled toggle, sub-permission toggles (canView, canEdit, etc.)
   - For AssetPermissions2: additional "Restrict To" multi-select for asset/category IDs
2. Create `UserEditPage.tsx`:
   - Route: `/settings/users/:userId/edit` and `/settings/users/new`
   - Basic info form: login, firstname, lastname, email, password, enabled toggle
   - Permissions grid below
   - "Copy Rights From" dropdown + copy button (loads another user's permissions)
   - Save button
3. Add routes to App.tsx
4. In UserManagementPage, add Edit action that navigates to UserEditPage

**Acceptance criteria:**
- User edit page loads user data
- All permission toggles reflect current state
- Changing toggles updates the permissions object
- "Copy Rights From" copies another user's permissions
- Save persists changes
- New user creation works

---

## C.2 Global Conditions Page

**Files to create:** `src/pages/settings/GlobalConditionsPage.tsx`
**Files to modify:** `src/App.tsx` (replace Placeholder route)

**Description:** Page listing global conditions with CRUD. **Depends on A.7** (Condition Editor from Claude).

**Steps:**
1. Create `GlobalConditionsPage.tsx`:
   - Standard entity list page (follow CampaignsPage pattern)
   - Fetch conditions with `useConditions()` hook (created by Claude in A.1)
   - DataTable with columns: Name, Type, Rule Count, Actions
   - "Add Condition" button opens condition editor
   - Edit action opens condition editor with existing data
   - Delete action with confirmation
2. In App.tsx, replace `<Placeholder title="Global Conditions" />` with `<GlobalConditionsPage />`

**Acceptance criteria:**
- Page lists all global conditions
- CRUD operations work
- Condition editor opens for create/edit (uses component from A.7)
- Delete with confirmation dialog
- Empty state when no conditions exist

---

## General Notes

- Follow existing patterns in the codebase exactly
- Use lucide-react for icons
- Use Tailwind CSS for styling (use `cn()` from `@/lib/utils` for merging)
- Use `useToast()` for success/error notifications
- All new hooks should be exported from `src/api/hooks/index.ts`
- All new query keys should be added to `src/api/queryKeys.ts`
- Run `npm run build` after completing each major task to catch errors
