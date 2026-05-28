# FunnelFlux Admin UI - Complete Specification

This document provides a complete breakdown of every page, component, and interaction in the existing PHP/jQuery admin UI at `/admin/`. It serves as the definitive reference for building the React replacement UI.

Screenshots are in the repo root: `admin-01-dashboard.png` through `admin-15-stats-dropdown.png`.

---

## Table of Contents

1. [Navigation Structure](#1-navigation-structure)
2. [Dashboard](#2-dashboard)
3. [Campaigns List](#3-campaigns-list)
4. [Funnel Builder / Editor](#4-funnel-builder--editor)
5. [QuickView (Stats Overlay)](#5-quickview-stats-overlay)
6. [Drilldown Reports](#6-drilldown-reports)
7. [Landers](#7-landers)
8. [Offers](#8-offers)
9. [Traffic Sources](#9-traffic-sources)
10. [Offer Sources](#10-offer-sources)
11. [System Links](#11-system-links)
12. [Stored Links](#12-stored-links)
13. [Data Updates - Conversions](#13-data-updates---conversions)
14. [Data Updates - Traffic Costs](#14-data-updates---traffic-costs)
15. [Data Updates - Reset Stats](#15-data-updates---reset-stats)
16. [System Settings](#16-system-settings)
17. [Traffic Filters](#17-traffic-filters)
18. [Visitor Tags](#18-visitor-tags)
19. [Global Conditions](#19-global-conditions)
20. [User Management](#20-user-management)
21. [Inbox](#21-inbox)
22. [Access Log](#22-access-log)
23. [System Updates](#23-system-updates)
24. [Shared UI Patterns](#24-shared-ui-patterns)
25. [Column / Field Reference](#25-column--field-reference)

---

## 1. Navigation Structure

### Top Navbar (Left)

```
Dashboard | Campaigns | Stats v | Sources v | $$ Offers | Landers | Links v | Data Updates v
```

**Dropdown: Stats**
- Drilldown Reports (Tree) -> `stats.reports.drilldownTreeIsolated`
- Drilldown Reports (Flat) -> `stats.reports.drilldownFlatIsolated`

**Dropdown: Sources**
- Traffic Sources -> `traffic-sources.list`
- Offer Sources -> `affiliate-networks.list`

**Dropdown: Links**
- System Links -> `links.get`
- Stored Links -> `links.stored-links.list`

**Dropdown: Data Updates**
- Update Conversions -> `data-updates.conversions`
- Update Traffic Costs -> `data-updates.cpv`
- Reset Stats -> `data-updates.reset`

### Top Navbar (Right Icons)

```
[Gear] [Chat] [Notifications] [User]
```

**Gear (Settings) Dropdown:**
- System Settings -> `system.systemSettings`
- Traffic Filters -> `system.filters.traffic.list`
- Visitor Tags -> `system.tags.list`
- Global Conditions -> `system.conditions.list`
- System Updates -> `system.updates`
- Access Log -> `system.accesslog.list`

**User Dropdown:**
- Edit User Settings -> `system.usermanagement.edit`
- User Management -> `system.usermanagement.list`
- Inbox -> `system.usermanagement.inbox.list`

### Footer
```
(c) 2026 FunnelFlux.com - Version 3.001
Your IP is: [IP]
Clear Tracking Session (ctrl + delete)
Open Shortcut Palette (ctrl + alt + p)
```

---

## 2. Dashboard

**URL:** `?section=stats.dashboard`
**Screenshot:** `admin-01-dashboard.png`

### Live Stats Banner
Top bar showing real-time aggregated metrics:
- VISITS (with delta arrows)
- CLICKS
- CONV.
- REVENUE
- COST
- NET
- ROI %

Controls: Date range picker | Timezone selector

### Chart Area
- Multi-series line/area chart
- Toggle buttons: **Visits** | **Clicks** | **Conversions** | **Revenue** | **Cost** | **ROI**
- X-axis: time (auto-scales by date range)
- Y-axis: metric values

### Four Data Tables (2x2 grid)

**Top-Left: Funnel Name**
| Column | Description |
|--------|-------------|
| Funnel Name | Link to quickview |
| Visits (sortable, default sort desc) | |
| Clicks | |
| CTR | |
| Conv. | |
| Rev... (Revenue) | |
| P/L (Profit/Loss) | Color-coded green/red |

**Top-Right: Traffic Source Name**
Same columns as Funnel table

**Bottom-Left: Lander Name**
Same columns (shows "No Data" if empty)

**Bottom-Right: Offer Name**
Same columns (shows "No Data" if empty)

Each table has Prev/Next pagination (e.g., "Page 1 / 495 (4,945)")

### World Map
Choropleth map showing traffic by country (blue gradient intensity)

---

## 3. Campaigns List

**URL:** `?section=campaigns.list`
**Screenshots:** `admin-02-campaigns-list.png`, `admin-03-campaigns-expanded.png`, `admin-06-campaigns-expanded-funnels.png`

### Grid Technology
**SlickGrid** (custom virtual-scrolling grid, NOT HTML table)

### Toolbar
| Control | Description |
|---------|-------------|
| **"Add New Campaign or Funnel"** button | Opens create dialog |
| **Date Range Picker** | "Last year" default |
| **Timezone Selector** | Searchable dropdown |
| **Status Filter** | Dropdown: Show All / Show Active / Show Archived |
| **Columns** button | Checkbox list of toggleable columns + Apply button |
| **Collapse / Expand** buttons | Toggle all campaign rows open/closed |
| **Traffic Source Filter** | Dropdown: "All Traffic Sources" or specific one |

### Tree Table Structure
**Level 0: Campaign rows** (expandable with `>` toggle)
- Campaign icon (orange target icon)
- Campaign name (clickable -> quickview)

**Level 1: Funnel rows** (children, indented)
- Funnel icon (blue funnel icon)
- Funnel name (clickable -> quickview)

### Columns (all toggleable via Columns button)

| Column | API Field | Description |
|--------|-----------|-------------|
| Name | `campaignName` / `funnelName` | Asset name with icon + actions |
| ID | `idCampaign` / `idFunnel` | 19-digit unsigned int64 |
| Visits | `entrances` | Funnel entrance count |
| Clicks | `clicks` | Click-through count |
| CTR | `ctr` | Click-through rate % |
| Conv. | `conversions` | Conversion count |
| CRV | `cvr` | Conversion rate % |
| EPV | `epv` | Earnings per visit |
| CPV | `cpv` | Cost per visit |
| EPA | `epa` | Earnings per action |
| CPA | `cpa` | Cost per action |
| Revenue | `revenue` | Total revenue |
| Cost | `cost` | Total cost |
| P/L | `profitLoss` | Profit/Loss (green positive, red negative) |
| ROI | `roi` | Return on investment % (green/red) |

### Column Filter Row
Below column headers: text input filter for each column

### Inline Row Actions (Campaign)

| Icon | Action | Function Call |
|------|--------|---------------|
| Drill-Down | Click name -> quickview | Navigate to `stats.quickview` |
| Edit | Pencil icon | `getPopupCampaign(id)` |
| Clone | Copy icon | `cloneCampaign(id, name)` |
| Archive | Box icon | `archiveCampaign(id, name)` |
| Delete | Trash icon (red) | `deleteCampaign(id, name)` |

### Inline Row Actions (Funnel)

| Icon | Action | Function Call |
|------|--------|---------------|
| Drill-Down | Click name -> quickview | Navigate to `stats.quickview` |
| Edit | Pencil icon -> funnel builder | Navigate to `campaigns.funnels.edit` |
| Clone | Copy icon | `cloneFunnel(id, name, campaignId)` |
| Archive | Box icon | `archiveFunnel(id, name)` |
| Delete | Trash icon (red) | `deleteFunnel(id, name)` |

### Pagination
"Showing page 1 of 51" | Show: All 25 50 100

---

## 4. Funnel Builder / Editor

**URL:** `?section=campaigns.funnels.edit&cid={campaignId}&cfid={funnelId}`
**Screenshot:** `admin-08-funnel-builder.png`

This is the most complex page. It uses **jsPlumb 1.7.2** for the visual flow diagram.

### Top Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Funnel Name | Text input | Yes | |
| Default Cost per Entrance | Number | No | Default: 0 |
| Funnel ID | Read-only | - | 19-digit int64 |
| Notes | Textarea | No | |
| Campaign Name | Dropdown (disabled) | - | Shows parent campaign |
| Campaign ID | Read-only | - | |

### Advanced Settings (Collapsible Accordion)
Shows `*edited*` in red when modified.

**Tab 1: Custom Configuration**
- Custom Tokens: textarea, `key=value` per line
- Accumulate URL Params: text input, `p1=val1&p2=val2` format

**Tab 2: Cost Overrides**
- Dynamic rows: Traffic Source dropdown + Cost per Entrance input
- Add Another button

**Tab 3: Postback Overrides**
- Dynamic rows: Traffic Source dropdown + Postback Type dropdown + Postback Code input
- Postback types: none, postbackUrl, pixelUrl, javascript

### Canvas Area
Dark-themed container (`#funnelDiagramContainer`) with jsPlumb diagram.

**Heatmap Dropdown** (top-left of canvas): Select a funnel to overlay stats, or "No Heatmap"

**Save Funnel** button (bottom of canvas + top-right)

### Node Types on Canvas

| Type | Icon/Shape | Color | Ports |
|------|-----------|-------|-------|
| **TRAFFIC (Root)** | Red circle with chart icon | Red | 1 output |
| **Rotator** | Blue circle with arrows | Blue | 1 output per connection |
| **Lander** | Blue rectangle with page icon | Blue | 1 input, N action outputs |
| **Offer** | Green rectangle with $ icon | Green | 1 input, N action outputs |
| **External URL** | Gray rectangle | Gray | 1 input |
| **Condition** | Diamond with ? | Yellow | 1 input, 2 outputs (Yes/No) |
| **JS Code** | Rectangle with code icon | Purple | 1 input, N done outputs |
| **PHP Code** | Rectangle with code icon | Purple | 1 input, N done outputs |
| **Visitor Tag** | Tag icon | Teal | 1 input, no output |

### Connection Labels
- **From Root/Rotator**: Shows percentage (e.g., "100.0%")
- **From Lander/Offer**: Shows "ON ACTION 1", "ON ACTION 2", etc.
- **From Condition**: Shows "YES" or "NO"
- **From Code**: Shows "ON DONE 1", etc.
- Labels are draggable along the connection line

### Canvas Interactions

**Right-Click on Canvas Background:**
- Add Offers (multi-select dialog)
- Add Landers (multi-select dialog)
- Add an External URL
- Add a Rotator
- Add a Condition
- Advanced submenu:
  - Add Visitor Tag(s)
  - Add Javascript Code
  - Add PHP Code

**Right-Click on Root Node:**
- Send Traffic Here (opens link generator)

**Right-Click on Regular Node:**
- Send Traffic Here
- Delete This Node

**Right-Click on Page Node (Lander/Offer):**
- Send Traffic Here
- Edit This Page (opens page editor modal)
- Delete This Node

**Right-Click on Connection Label:**
- Get Action's URL (copies to clipboard)
- Delete This Connection

**Drag from Port:** Creates new connection with jsPlumb bezier curve

**Double-click Node:** Opens node-specific edit dialog

**Drag Node:** Repositions on canvas (stores as % of canvas width/height)

### Node Edit Dialogs

| Node Type | Dialog Fields |
|-----------|--------------|
| Lander/Offer | Page selector dropdown, URL params toggle, additional tokens |
| Condition | Condition selector dropdown (shows rules preview) |
| External URL | URL text input |
| JS Code | Ace code editor, name, delay option |
| PHP Code | Ace code editor, name |
| Visitor Tag | Multi-select tag picker |
| Rotator | Rotation type: Random / Session |

### Connection Edit Dialogs

| Source Type | Dialog |
|-------------|--------|
| Root/Rotator | Percentage slider (noUiSlider, 0-100%) |
| Lander/Offer | Action number dropdown + "Is Conversion?" checkbox (offer only) |
| Condition | ifYes / ifNo selector |
| Code | "On Done" number dropdown |

### Quick Stats Section (Below Canvas)

**Header:** "Funnel Quick Stats: {funnel_name}"

**Filters:**
- Traffic Source dropdown (All Traffic Sources)
- Date range picker (defaults to Today)
- Refresh button

**Grouping Buttons (3 rows):**

Row 1 (orange/green):
Conversion Paths | Conversion Paths (all nodes) | Landers | Offers | MVT (Combinations) | MVT (Key-Value Pairs) | Traffic Sources | Funnels | Week Parting | Day Parting | Historical Perf.

Row 2 (gray-blue):
Device Type | Device Name | OS | OS - Version | OS - Browser | Browser | ISP | Mobile Carrier | Connection Type | IP | Referrer

Row 3 (blue-gray):
Continent | Country | Region | City | Drilldown

**Controls:** Print | CSV | Show Winners dropdown | Columns button

**Stats Table:**
| Column | Description |
|--------|-------------|
| Grouping | Row label |
| Offer Views | |
| Conv. | |
| CVRlv | Conversion rate (lifetime value) |
| CVRov | Conversion rate (offer views) |
| Revenue | |
| Cost | |
| P/L | |
| ROI | |

---

## 5. QuickView (Stats Overlay)

**URL:** `?section=stats.quickview&sgb1={groupBy}&sgid1={entityId}&dtRangeName={range}&timezone={tz}`
**Screenshot:** `admin-09-quickview.png`

Same grouping buttons and stats table as the funnel builder's Quick Stats section, but standalone page.

**Header:** "{Entity Type} Quick Stats:"

**Filters:**
- Traffic Source dropdown
- Funnel dropdown
- Date range picker
- Refresh button

All the same grouping buttons in 3 rows.

---

## 6. Drilldown Reports

**URLs:**
- Tree: `?section=stats.reports.drilldownTreeIsolated`
- Flat: `?section=stats.reports.drilldownFlatIsolated`

### Grouping Selector
Cascading multi-level grouping (up to 10 levels) using Tom Select dropdowns.

### Available Groupings

**Element:**
- Campaign, Funnel, Lander, Offer, Lander/Offer, Lander-Offer Category, Node ID, Node Name

**Insight:**
- Conversion Path (All Nodes), Conversion Path (Landers+Offers), MVT Combination, MVT Key-Value

**Third Party:**
- Traffic Source, Offer Source

**Device:**
- Device Type, Brand, Model, OS, OS Version, Browser, Browser Version, User Agent

**Connection:**
- ISP, Referrer, Referrer Domain, IP, Block-C IP (/24)

**Location:**
- Continent, Country Code, Country Name, Region, City, Timezone

**Time:**
- Date, HH:MM, Week-Parting, Day-Parting

**Custom:**
- Tracking Fields 1-10 (dynamically labeled per traffic source)

**Hit/Conversion:**
- Hit ID, Hit Time, Conversion ID, Conversion TxID, Conversion Time, Time to Conversion, Visitor, Filtered Status, Action Number, Click Time

### Filters
- Date range picker
- Per-grouping whitelist/blacklist filters
- Show Filtered Traffic toggle
- Country restriction
- Tracking field restrictions (single or bulk mode)

### View Toggle
- Tree View (hierarchical, expandable rows)
- Flat View (all rows at same level)

### Columns
Same stat columns as campaigns table plus additional:
- Entrances, Total Clicks, Unique Clicks, CTR, Conversions, CVR, Revenue, Cost, Profit, ROI, EPV, EPC, CPV, CPA, EPA, and more configurable via Columns button

### Export
- CSV
- Print

---

## 7. Landers

**URL:** `?section=pages.list`
**Screenshot:** `admin-11-landers.png`

### Toolbar
| Control | Description |
|---------|-------------|
| **"Add New Lander"** button | Opens create dialog |
| **CSV Import** | Bulk import from CSV |
| **Bulk Action** dropdown | Move to Category, Archive Selected, Restore Selected, Delete Selected |
| **Date Range Picker** | |
| **Timezone Selector** | |
| **Status Filter** | Show All / Show Active / Show Archived |
| **Columns** button | |
| **Collapse All / Expand All** | Category grouping |

### Category Tree
Rows grouped by category (e.g., "Uncategorized", "EIRINI"). Categories are expandable/collapsible.

### Columns

| Column | Description |
|--------|-------------|
| Checkbox | For bulk selection |
| Name | Lander name + inline action icons |
| ID | 19-digit int64 |
| URL | Landing page URL (truncated) |
| Visits | |
| Clicks | |
| CTR | |
| Conv. | |
| CRV | |
| EPV | |
| CPV | |
| EPA | |
| CPA | |
| Revenue | |
| Cost | |
| P/L | |
| ROI | |

### Inline Actions
| Icon | Action |
|------|--------|
| Edit | Opens edit dialog |
| Clone | Duplicates lander |
| Archive | Moves to archived |
| Delete | Removes lander |

### Edit/Create Dialog Fields

| Field | Type | Notes |
|-------|------|-------|
| Page Name | Text | Required |
| URL | Text | Required, full URL |
| Category | Dropdown | Optional grouping |
| Redirect Type | Dropdown | 307 (default), 302, 301, JS, Meta refresh |
| Number of Actions | Number | How many action links the lander has (1-64) |
| Advanced Settings | Accordion | Caching, link rewriting, query string handling |

---

## 8. Offers

**URL:** `?section=pages.offers.list`
**Screenshot:** `admin-12-offers.png`

Identical layout to Landers with these additional columns:

| Column | Description |
|--------|-------------|
| Offer Source | Associated affiliate network/offer source |
| Payout | Default payout amount |

### Edit/Create Dialog - Additional Fields

| Field | Type | Notes |
|-------|------|-------|
| Offer Source | Dropdown | Select from configured offer sources |
| Default Payout | Currency input | Revenue per conversion |
| Conversion Rules | Dynamic rows | Action number + rule definition |

---

## 9. Traffic Sources

**URL:** `?section=traffic-sources.list`

Same grid layout as Campaigns but without tree hierarchy.

### Toolbar
- "New Traffic Source" button
- Templates dropdown (load from preset)
- Status filter, Columns, Bulk actions

### Columns
Same stat columns as Campaigns plus:
| Column | Description |
|--------|-------------|
| Category | Traffic source category |

### Edit/Create Dialog Fields

| Section | Field | Type | Notes |
|---------|-------|------|-------|
| **Basic** | Name | Text | Required |
| | Cost Type | Dropdown | CPE (Cost Per Entrance) or CPA |
| | Default Cost | Number | |
| | Category | Dropdown | Optional |
| **Tracking Fields** | Field Name + Token | Dynamic rows | Pattern: `^[a-zA-Z0-9_-]+$` |
| | | | Example: `clickid` = `{gclid}` |
| **Postback** | Type | Dropdown | None / Postback URL / Pixel URL / JavaScript |
| | Code | Text/Textarea | URL or JS code depending on type |
| | | | Available tokens: `{trackingfield-NAME}`, `{PAYOUT}`, `{HIT_ID}`, `{TRANSACTION_ID}`, `{TIMESTAMP}` |

### Templates
Pre-configured traffic source templates (Google, Facebook, TikTok, etc.) that auto-fill tracking fields and postback configuration.

---

## 10. Offer Sources

**URL:** `?section=affiliate-networks.list`

### Edit/Create Dialog Fields

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Required |
| Sub-ID Field | Text | e.g., "sid", "subid" |
| Query Separator | Text | e.g., "&", "?" |
| Postback URL | Text | Server-to-server callback URL |
| Category | Dropdown | Optional |

### Templates
Pre-configured offer source templates (ClickBank, MaxBounty, etc.)

---

## 11. System Links

**URL:** `?section=links.get`

Step-by-step link generator wizard:

### Step 1: Campaign Selection
Dropdown of all campaigns

### Step 2: Funnel Selection
Cascading dropdown based on campaign

### Step 2B: Node Selection (Optional)
Target specific node in funnel

### Step 3: Traffic Source Selection
Dropdown + "Add" button to create inline

### Step 4: Cost Per Visit
Numeric input

### Step 5: Copy Your Link
Two modes:
- **Standard URL**: Readonly URL field + Copy + QR Code buttons
- **No-Redirect JavaScript**: Checkbox toggle + JS embed code textarea

### Additional Link Sections

**Funnels' Action Click URLs:**
- Action number selector (1-64)
- Generated URL + Copy button

**Conversion Postback URL:**
- Hit ID parameter (mandatory)
- Transaction ID (optional)
- Payout override (optional)
- Generated URL + Copy button

**Conversion iFrame / Pixel:**
- Auto-generated embed code
- Copy buttons

**ClickBank Integration:**
- Secret Key (read-only)
- Notification URL + Copy button

---

## 12. Stored Links

**URL:** `?section=links.stored-links.list`

### List Toolbar
- "Add New Link" button
- Date Range Picker
- "Show links with traffic" toggle

### Table Columns
- Link Name
- URL
- Stats columns (Visits, Clicks, etc.)
- Actions (Edit, Delete)

### Edit/Create Form

**Option A: Custom URL**
- Link Name (URL-safe pattern: `^[a-zA-Z0-9_-]+$`)
- Custom URL

**Option B: Funnel Link**
- Same cascading Campaign -> Funnel -> Node -> Traffic Source flow as System Links

---

## 13. Data Updates - Conversions

**URL:** `?section=data-updates.conversions`

### Form

**Postback Firing Options (radio):**
1. Do not fire postback URLs
2. Fire only for hits not yet fired
3. Fire for all hits (even if already fired)

**Conversion Data Input:**
Textarea, one conversion per line:
```
HIT-ID                          # Simple conversion
HIT-ID, PAYOUT                  # With custom payout
HIT-ID:TRANSACTION-ID, PAYOUT   # Multiple conversions per hit
HIT-ID, -1                      # Delete conversion
```

**"Update Conversions" button**

---

## 14. Data Updates - Traffic Costs

**URL:** `?section=data-updates.cpv`

### Form (Cascading Steps)

| Step | Field | Type |
|------|-------|------|
| 1 | Campaign | Dropdown |
| 2 | Funnel | Cascading dropdown (NOW OPTIONAL per our recent change) |
| 3 | Traffic Source | Dropdown |
| 4 | Time Period | Date Range Picker |
| Optional | Country Restriction | Country dropdown |
| Optional | Apply to Filtered Traffic | Toggle |
| Optional | Tracking Field Restrictions | Single mode: up to 5 field=value pairs. Bulk mode: textarea with `COST\|FIELD1\|VALUE1\|...` |
| 5 | Update Method | Radio: Adjust Total Cost OR Adjust CPE |
| | Cost Value | Currency input |

**"Update Cost" button**

---

## 15. Data Updates - Reset Stats

**URL:** `?section=data-updates.reset`

### Form

| Field | Type | Notes |
|-------|------|-------|
| Date Range | Date Range Picker | Period to reset |
| Restrict To | Entity group selector | Campaign, Funnel, Traffic Source, etc. |

Shows: "X Entrances Will Be Deleted Permanently"

**"Reset These Stats" button** (danger/alert style with confirmation)

---

## 16. System Settings

**URL:** `?section=system.systemSettings`

### Setting Fields

| Setting | Type | Description |
|---------|------|-------------|
| Default Drilldown | Dropdown | Tree or Flat |
| Force HTTPS | Toggle | Only enable after SSL configured |
| Auto-expand Campaigns | Toggle | Expand all campaigns on list load |
| Offers' Default Redirect | Dropdown | Default redirect type for new offers |
| Landers' Default Redirect | Dropdown | Default redirect type for new landers |
| Default Home Page | Text URL | Fallback URL (empty = 404) |
| Threshold % for Winners | Number | Statistical confidence threshold |
| Domain Inventory | List/Form | Add, edit, and delete known domains only |
| Default Tracking Domain | Dropdown | Domain used for generated tracking links |
| Login / License Domain | Dropdown | Domain used for `application.webRoot` and license attachment |
| ClickBank API Key | Text | For ClickBank integration |
| API Key | Text | V2 API authentication key |

---

## 17. Traffic Filters

**URL:** `?section=system.filters.traffic.list`

### List
- "New Filter" button
- Table with filter rules and status

### Edit/Create
- Filter name
- Condition rules (IP ranges, user agents, geo, etc.)
- Actions (block, tag, redirect)
- Apply Retroactively option

---

## 18. Visitor Tags

**URL:** `?section=system.tags.list`

### List
- Tag name
- Usage count
- Edit/Delete actions

### Create/Edit
- Tag name input
- Save button

---

## 19. Global Conditions

**URL:** `?section=system.conditions.list`

### List
- Condition name
- Type (global/local)
- Rule summary
- Edit/Delete actions

### Edit/Create
- Condition name
- Rule Groups (AND/OR logic):
  - Field selector (country, device, OS, browser, IP, referrer, tracking fields, etc.)
  - Operator (equals, contains, regex, starts_with, etc.)
  - Value input
- Add Rule / Add Rule Group buttons

---

## 20. User Management

**URL:** `?section=system.usermanagement.list`

### List Columns
| Column | Description |
|--------|-------------|
| ID | User ID |
| Name | Firstname + Lastname |
| Email | |
| Admin Privileges | Yes/No |
| Status | Enabled/Disabled |
| Archive | Active/Archived |
| Actions | Edit, Archive, Delete |

### Edit/Create Form

**User Profile:**
| Field | Type | Notes |
|-------|------|-------|
| Firstname | Text | Required |
| Lastname | Text | Required |
| Email | Email | Required |
| Username | Text | Required |
| Password | Password | Required on create, Change button on edit |
| Confirm Password | Password | Must match |
| Account Status | Toggle | Admin only, for non-admin users |

**Avatar:**
- Gravatar display (150x150)
- Custom upload (max 900KB)

**Permissions (admin editing non-admin):**
- Copy Permissions From dropdown
- Per-category permission toggles:
  - Campaigns: Create, Edit, Delete, Archive
  - Pages: Create, Edit, Delete, Archive
  - Traffic Sources: Create, Edit, Delete, Archive
  - Offer Sources: Create, Edit, Delete, Archive
  - Traffic Filters: Create, Edit, Delete
  - User Management: Create, Edit, Delete
  - System Settings: Edit
  - Data Updates: Access

---

## 21. Inbox

**URL:** `?section=system.usermanagement.inbox.list`

### List
- Message table with checkboxes
- Bulk actions: Mark read/unread, Delete

### Message View
- Title (read-only)
- Date (read-only)
- Body (read-only text)

---

## 22. Access Log

**URL:** `?section=system.accesslog.list`

### Table
- Timestamp
- User
- IP Address
- Action/Endpoint
- Details

---

## 23. System Updates

**URL:** `?section=system.updates`

### Content
- Current version display
- Available updates list
- Install button for each update
- Update log / changelog

---

## 24. Shared UI Patterns

### SlickGrid Tables (Campaigns, Landers, Offers, Traffic Sources)
- Virtual scrolling (renders only visible rows)
- Column sorting (click header)
- Column filtering (text inputs below headers)
- Column visibility toggle (Columns button)
- Category grouping (expand/collapse)
- Inline action icons on row hover
- Pagination: "Show: All 25 50 100"
- Stats integration (date range, timezone, traffic source filter)

### Date Range Picker
- Preset ranges: Today, Yesterday, Last 7 days, Last 30 days, This Month, Last Month, Last 3 Months, Last Year, Custom
- Custom date input fields
- Applies globally to stats on the page

### Timezone Selector
- Searchable dropdown
- Shows UTC offset + city names
- Persisted in user preferences

### Status Filter
- Dropdown: Show All / Show Active / Show Archived
- Applies to entity list

### Bulk Actions
- Checkbox per row
- Dropdown: Move to Category, Archive Selected, Restore Selected, Delete Selected
- Disabled until rows selected

### Confirmation Dialogs
- Delete operations always show confirmation modal
- Shows entity name in confirmation message

### Permission Gating
- Buttons hidden if user lacks permission
- Actions server-validated even if UI allows

---

## 25. Column / Field Reference

### Stats Columns (shared across all stat-enabled pages)

| Display Name | API Field | Formula |
|-------------|-----------|---------|
| Visits | `entrances` | Total funnel entrances |
| Clicks | `clicks` | Total clicks (actions) |
| CTR | `ctr` | clicks / entrances * 100 |
| Conv. | `conversions` | Total conversions |
| CRV | `cvr` | conversions / entrances * 100 |
| EPV | `epv` | revenue / entrances |
| CPV | `cpv` | cost / entrances |
| EPA | `epa` | revenue / conversions |
| CPA | `cpa` | cost / conversions |
| Revenue | `revenue` | Total revenue |
| Cost | `cost` | Total cost |
| P/L | `profitLoss` | revenue - cost |
| ROI | `roi` | (revenue - cost) / cost * 100 |

### Additional Drilldown Columns

| Display Name | API Field |
|-------------|-----------|
| Unique Clicks | `uniqueClicks` |
| EPC | `epc` (earnings per click) |
| Total Entrances | `totalEntrances` |
| Offer Views | `offerViews` |
| Lander Views | `landerViews` |
| CVR (Offer Views) | `cvrOfferViews` |
| CVR (Lifetime) | `cvrLifetime` |

### Entity ID Format
All entity IDs are **unsigned 64-bit integers** represented as **strings** in JSON (19 digits, e.g., `"2502281380989554621"`). IDs are **caller-generated** (the UI generates them before saving).

---

## React UI Coverage Checklist

### Priority 1 (Core Functionality)
- [ ] Auth: Session login/logout
- [ ] Dashboard with live stats, chart, 4 tables, map
- [ ] Campaigns list with tree table (Campaign > Funnel hierarchy)
- [ ] Funnel builder with ReactFlow (9 node types, connections, context menus)
- [ ] Landers CRUD with category grouping
- [ ] Offers CRUD with category grouping + offer source + payout
- [ ] Traffic Sources CRUD with tracking fields + postback config
- [ ] Offer Sources CRUD
- [ ] System Links generator wizard
- [ ] Drilldown Reports (tree + flat) with groupings

### Priority 2 (Essential Operations)
- [ ] Data Updates: Conversions, Cost, Reset Stats
- [ ] Stored Links
- [ ] QuickView stats overlay
- [ ] Bulk actions (archive, delete, move category)
- [ ] Clone operations
- [ ] CSV import/export

### Priority 3 (Admin/Settings)
- [ ] System Settings
- [ ] Traffic Filters CRUD
- [ ] Visitor Tags
- [ ] Global Conditions
- [ ] User Management with permissions
- [ ] Inbox
- [ ] Access Log
- [ ] System Updates

### Priority 4 (Polish)
- [ ] Column visibility persistence
- [ ] Date range + timezone persistence
- [ ] Keyboard shortcuts (ctrl+delete, ctrl+alt+p)
- [ ] Heatmap overlay on funnel builder
- [ ] Templates for traffic sources + offer sources
- [ ] ClickBank integration
- [ ] QR code generation
