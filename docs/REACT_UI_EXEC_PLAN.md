# FunnelFlux React UI — Executive Specification

> **Purpose**: Complete specification for building a new open-source React UI that replaces the legacy PHP/jQuery admin interface. This document maps every page, every API call, every UI component, and every user interaction so a new team/agent can build from scratch without access to the legacy codebase.

> **Generated**: 2026-03-16 from full codebase analysis of FunnelFlux Self-Hosted
> **Updated**: 2026-03-25 — corrected tech stack, folder paths, node types, added current state, updated API gaps

---

## Table of Contents

1. [Architecture Decision](#1-architecture-decision)
2. [System Overview](#2-system-overview)
3. [Authentication & Session](#3-authentication--session)
4. [Navigation & Layout](#4-navigation--layout)
5. [Page Specifications](#5-page-specifications)
   - 5.1 [Dashboard](#51-dashboard)
   - 5.2 [Drilldown Reports (Tree)](#52-drilldown-reports-tree)
   - 5.3 [Drilldown Reports (Flat)](#53-drilldown-reports-flat)
   - 5.4 [Campaign List](#54-campaign-list)
   - 5.5 [Campaign Edit](#55-campaign-edit)
   - 5.6 [Funnel Editor (Visual)](#56-funnel-editor-visual)
   - 5.7 [Condition Editor](#57-condition-editor)
   - 5.8 [Landers List](#58-landers-list)
   - 5.9 [Lander Edit](#59-lander-edit)
   - 5.10 [Offers List](#510-offers-list)
   - 5.11 [Offer Edit](#511-offer-edit)
   - 5.12 [Traffic Sources List](#512-traffic-sources-list)
   - 5.13 [Traffic Source Edit](#513-traffic-source-edit)
   - 5.14 [Offer Sources List](#514-offer-sources-list)
   - 5.15 [Offer Source Edit](#515-offer-source-edit)
   - 5.16 [System Links (Generate)](#516-system-links-generate)
   - 5.17 [Stored Links](#517-stored-links)
   - 5.18 [Stored Link Edit](#518-stored-link-edit)
   - 5.19 [System Settings](#519-system-settings)
   - 5.20 [Traffic Filters List](#520-traffic-filters-list)
   - 5.21 [Traffic Filter Edit](#521-traffic-filter-edit)
   - 5.22 [Global Conditions](#522-global-conditions)
   - 5.23 [Visitor Tags](#523-visitor-tags)
   - 5.24 [Access Log](#524-access-log)
   - 5.25 [User Management List](#525-user-management-list)
   - 5.26 [User Management Edit](#526-user-management-edit)
   - 5.27 [Inbox](#527-inbox)
   - 5.28 [Data Updates — Conversions](#528-data-updates--conversions)
   - 5.29 [Data Updates — Traffic Costs](#529-data-updates--traffic-costs)
   - 5.30 [Data Updates — Reset Stats](#530-data-updates--reset-stats)
   - 5.31 [Heatmaps (Funnel Stats Overlay)](#531-heatmaps)
   - 5.32 [Quickview](#532-quickview)
   - 5.33 [System Updates](#533-system-updates)
6. [Complete V2 API Reference](#6-complete-v2-api-reference)
7. [API Gaps — Endpoints Still Needed](#7-api-gaps--endpoints-still-needed)
8. [Shared Components](#8-shared-components)
9. [Recommended Tech Stack](#9-recommended-tech-stack)
10. [Current State of the React UI](#10-current-state-of-the-react-ui)
11. [Implementation Phases](#11-implementation-phases)
12. [Deployment Models](#12-deployment-models)

---

## 1. Architecture Decision

### Deployment Model: Separate Repo, Static Build, Co-located on Server

```
funnelflux-open-ui/     ← Separate open-source repo (Vite + React 19 SPA)
  src/
  package.json
  vite.config.ts        ← base: '/v2-ui/', builds to dist/

funnelflux-self-hosted/ ← Existing tracker repo
  v2-ui/                ← dist/ files deployed here (served by same Nginx)
```

**Why this approach:**
- **Separate repo**: Contributors only need Node.js, not PHP/MySQL/ClickHouse/Docker
- **Vite SPA** (not Next.js): Pure static output, no server runtime needed. Next.js static export loses SSR/API routes — the things that make it worth using. This app is 100% API-driven.
- **Co-located on server**: Same Nginx, same origin — no CORS, no latency, no Vercel account needed
- **Same-origin only**: The browser UI should use the existing PHP admin session on the same origin. Remote browser/API-key mode is not the target model.

**How it connects to the API**: Since Vite static files are served by the same Nginx as the tracker, the browser sees everything as same-origin. API calls use relative URLs:
```typescript
fetch('/admin/api/v2/data/campaign/list/', {
  credentials: 'same-origin'
})
```
No `localhost`, no hardcoded domains. The browser resolves `/admin/api/v2/...` against whatever domain the page loaded from.

### Key Constraint

The React UI communicates **exclusively** through the V2 REST API (`/admin/api/v2/`). No direct database access. The browser auth model is same-origin PHP-session authentication.

---

## 2. System Overview

### What FunnelFlux Does

FunnelFlux is a **traffic tracking and funnel management** platform for performance marketers. Users:

1. Create **Campaigns** containing **Funnels** (visual flowcharts of user journeys)
2. Configure **Landers** (landing pages) and **Offers** (affiliate offers) as nodes in funnels
3. Set up **Traffic Sources** (ad platforms) and **Offer Sources** (affiliate networks)
4. Generate **Tracking Links** that route visitors through funnels with conditional logic
5. View **Statistics** across multiple dimensions (campaign, country, device, etc.)
6. Apply **Traffic Filters** to exclude bots/fraud
7. Manage **Users** with granular RBAC permissions

### Domain Glossary

| Term | Definition |
|------|-----------|
| **Campaign** | Top-level container for funnels. Has a name, notes, URL suffix, custom tokens |
| **Funnel** | Visual flowchart within a campaign. Contains nodes and connections |
| **Node** | An element in a funnel: lander, offer, condition, rotator, code executor, external URL, or visitor tag |
| **Connection** | A directed edge between two nodes. Has weight (for rotators) and action number |
| **Lander** | Landing page node. Has URL, redirect type, advanced settings (caching, link rewriting, etc.) |
| **Offer** | Offer page node. Like a lander but with payout amount and offer source association |
| **Traffic Source** | An ad platform (Facebook, Google, etc.). Has tracking parameters and postback config |
| **Offer Source** | An affiliate network (MaxBounty, etc.). Has subid config and postback URL template |
| **Condition** | Rule-based routing node. AND/OR logic blocks with field/operator/value rules |
| **Rotator** | Traffic distribution node. Splits traffic by weight across connected nodes |
| **Code Snippet** | JavaScript or PHP code executed as a funnel node |
| **Visitor Tag** | Custom label applied to a visitor for segmentation |
| **Traffic Filter** | Rule to hide/redirect bot traffic (by IP, UA, country, ISP, referrer) |
| **Drilldown** | Multi-dimensional statistics report with grouping and filtering |
| **Heatmap** | Visual stats overlay on funnel diagram showing performance by node |
| **Stored Link** | Saved tracking URL with a human-readable name |
| **Entrance** | A visitor entering a funnel (= 1 visit) |
| **Action Click** | A visitor clicking through from one node to the next |
| **Conversion** | A visitor completing a desired action (purchase, signup, etc.) |
| **EPV** | Earnings Per Visit |
| **CPE** | Cost Per Entrance |
| **ROI** | Return on Investment: `(revenue - cost) / cost * 100` |
| **CVR** | Conversion Rate |
| **CTR** | Click-Through Rate |

---

## 3. Authentication & Session

### Existing Infrastructure (Current State)

The V2 API now has the browser auth pieces in place:

1. **Session Authentication for Browser UI**: The co-located React UI authenticates with the existing PHP admin session cookie
2. **API Key Authentication for Automation**: API keys remain for automation and server-to-server callers, not for browser bootstrap
3. **Session Status Endpoint**: `GET /admin/api/v2/auth/session/` verifies the current session and returns basic session user info only
4. **Full Permissions Endpoint**: `GET /admin/api/v2/ui/userprofile/loggedin/load/` returns the complete user profile + granular RBAC permissions for the current session user

### React UI Auth Flow

```
App loads
  ↓
Call GET /admin/api/v2/auth/session/  (session cookie only)
  ↓
200 OK? → Call GET /admin/api/v2/ui/userprofile/loggedin/load/ (session cookie only)
  ↓        → Get full permissions → render app
  ↓
401? → Show "Open Admin Login" screen
  ↓    → User signs in at /admin/login.php
  ↓    → Return to /v2-ui/
```

### Existing Permissions Response Shape

`GET /admin/api/v2/ui/userprofile/loggedin/load/` already returns this complete structure:

```json
{
  "id": 1,
  "login": "admin",
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@example.com",
  "avatarURL": "https://gravatar.com/...",
  "isAdmin": true,
  "enabled": true,
  "permissions": {
    "stats": {
      "enabled": true,
      "canView": true,
      "canEditCustomViews": true
    },
    "campaigns": {
      "enabled": true,
      "canView": true,
      "canCreateNew": true,
      "canEdit": true,
      "canArchive": true,
      "canDelete": true,
      "restrictTo": []
    },
    "trafficSources": {
      "enabled": true,
      "canView": true,
      "canCreateNew": true,
      "canEdit": true,
      "canArchive": true,
      "canDelete": true,
      "restrictTo": []
    },
    "offerSources": {
      "enabled": true,
      "canView": true,
      "canCreateNew": true,
      "canEdit": true,
      "canArchive": true,
      "canDelete": true,
      "restrictTo": []
    },
    "offers": {
      "enabled": true,
      "canView": true,
      "canCreateNew": true,
      "canEdit": true,
      "canArchive": true,
      "canDelete": true,
      "restrictToAssetIds": [],
      "restrictToCategoryIds": []
    },
    "landers": {
      "enabled": true,
      "canView": true,
      "canCreateNew": true,
      "canEdit": true,
      "canArchive": true,
      "canDelete": true,
      "restrictToAssetIds": [],
      "restrictToCategoryIds": []
    },
    "systemLinks": {
      "enabled": true,
      "canView": true
    },
    "storedLinks": {
      "enabled": true,
      "canView": true,
      "canCreateNew": true,
      "canEdit": true,
      "canDelete": true,
      "canResetStats": true
    },
    "trafficFilters": {
      "enabled": true,
      "canView": true,
      "canCreateNew": true,
      "canEdit": true,
      "canDelete": true,
      "canApplyToPastStats": true
    },
    "dataUpdates": {
      "enabled": true,
      "canUpdateConversions": true,
      "canUpdateTrafficCost": true,
      "canResetStats": true
    },
    "systemUpdates": {
      "enabled": true,
      "canView": true,
      "canInstallUpdate": true
    }
  }
}
```

### How Permissions Drive the React UI

**Navigation**: Hide menu items where `enabled: false`
```typescript
{permissions.campaigns.enabled && <NavItem to="/campaigns" />}
{permissions.dataUpdates.canResetStats && <NavItem to="/data-updates/reset" />}
```

**Route Guards**: Redirect inaccessible routes
```typescript
<Route path="/campaigns" element={
  permissions.campaigns.canView ? <CampaignList /> : <Navigate to="/" />
} />
```

**Action Buttons**: Hide create/edit/delete based on granular rights
```typescript
{permissions.campaigns.canCreateNew && <Button>Add Campaign</Button>}
{permissions.campaigns.canDelete && <DeleteButton />}
```

**Data Filtering**: `restrictTo` arrays filter which entities the user sees. The API enforces this server-side, but the UI can also pre-filter dropdowns to avoid showing entities the user can't access.

### TypeScript Types

```typescript
interface AuthState {
  user: UserProfile;
}

interface UserProfile {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  email: string;
  avatarURL: string;
  isAdmin: boolean;
  enabled: boolean;
  permissions: Permissions;
}

interface Permissions {
  stats: { enabled: boolean; canView: boolean; canEditCustomViews: boolean };
  campaigns: AssetPermissions;
  trafficSources: AssetPermissions;
  offerSources: AssetPermissions;
  offers: AssetPermissions & { restrictToAssetIds: string[]; restrictToCategoryIds: string[] };
  landers: AssetPermissions & { restrictToAssetIds: string[]; restrictToCategoryIds: string[] };
  systemLinks: { enabled: boolean; canView: boolean };
  storedLinks: { enabled: boolean; canView: boolean; canCreateNew: boolean; canEdit: boolean; canDelete: boolean; canResetStats: boolean };
  trafficFilters: { enabled: boolean; canView: boolean; canCreateNew: boolean; canEdit: boolean; canDelete: boolean; canApplyToPastStats: boolean };
  dataUpdates: { enabled: boolean; canUpdateConversions: boolean; canUpdateTrafficCost: boolean; canResetStats: boolean };
  systemUpdates: { enabled: boolean; canView: boolean; canInstallUpdate: boolean };
}

interface AssetPermissions {
  enabled: boolean;
  canView: boolean;
  canCreateNew: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canDelete: boolean;
  restrictTo: string[];
}
```

---

## 4. Navigation & Layout

### Main Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Dashboard | Campaigns | Stats ▼ | ...      │  ← Top nav bar (69px)
│          ... Sources ▼ | Offers | Landers | Links ▼ │
│                                    [⚙] [📖] [👤]   │  ← Settings, Docs, User
├─────────────────────────────────────────────────────┤
│                                                     │
│                   Page Content                      │  ← Full width, scrollable
│                                                     │
├─────────────────────────────────────────────────────┤
│  © FunnelFlux | v{version} | IP: {ip}              │  ← Footer
└─────────────────────────────────────────────────────┘
```

### Navigation Items

```
Dashboard
Campaigns
Stats ▼
  ├─ Drilldown Reports (Tree)
  └─ Drilldown Reports (Flat)
Sources ▼
  ├─ Traffic Sources
  └─ Offer Sources
Offers
Landers
Links ▼
  ├─ System Links
  └─ Stored Links
Data Updates ▼
  ├─ Update Conversions
  ├─ Update Traffic Costs
  └─ Reset Stats

[Settings ⚙] ▼
  ├─ System Settings
  ├─ Traffic Filters
  ├─ Visitor Tags
  ├─ Global Conditions
  ├─ System Updates (if self-hosted)
  └─ Access Log

[Docs 📖] ▼
  ├─ Knowledge Base (external link)
  ├─ Data API Docs
  ├─ Stats API Docs
  └─ System API Docs

[User 👤] ▼
  ├─ Inbox (with unread badge)
  ├─ Edit My Settings
  ├─ User Management (admin only)
  └─ Logout
```

### Notification System

- Poll `GET /ui/inbox/notifications/check/` every 45 seconds
- Response: `{ hasNew: bool, nbUnreadMessages: number }`
- Show badge count on User menu icon
- If `bForcePopup: true`, show toast/modal with system notification
- Animate badge on count change

---

## 5. Page Specifications

### 5.1 Dashboard

**Route**: `/dashboard`

**Purpose**: Real-time overview of key metrics with configurable widget tables and time-series chart.

#### API Calls

| Endpoint | Method | When Called | Purpose |
|----------|--------|------------|---------|
| `POST /ui/dashboard/load/` | POST | Page load, date change, refresh | Load all dashboard data |

**Request body**:
```json
{
  "elements": ["currentPeriod", "availableTimezones", "liveStats", "chart", "tableStats"]
}
```

**Response**:
```json
{
  "currentPeriod": {
    "timeRange": { "start": "ISO datetime", "end": "ISO datetime", "name": "Today" },
    "timeZone": { "name": "UTC", "offset": "+00:00" }
  },
  "availableTimezones": ["UTC", "America/New_York", ...],
  "liveStats": {
    "visits": 12345, "clicks": 6789, "conversions": 234,
    "revenue": 4567.89, "cost": 1234.56, "roi": "270.19%"
  },
  "chart": {
    "dates": ["2024-01-01", ...], "datesFormatted": ["Jan 1", ...],
    "visits": [100, ...], "clicks": [50, ...], "conversions": [5, ...],
    "revenue": [123.45, ...], "cost": [50.00, ...], "roi": [147.0, ...]
  },
  "tableStats": {
    "report": { "columns": [...], "rows": [...], "totals": {...} }
  }
}
```

#### UI Components

1. **Live Stats Bar** — 7 metric cards in a row:
   - Visits, Clicks, Conversions, Revenue, Cost, Net Profit, ROI
   - Each shows current period value
   - Refresh button

2. **Chart** — Time-series line chart:
   - X-axis: dates in period
   - Y-axis: selected metrics
   - Toggle buttons: Visits, Clicks, Conversions, Revenue, Cost, ROI
   - Multiple metrics can be active simultaneously
   - Library: Chart.js or Recharts

3. **Widget Tables** — Configurable grid of summary tables:
   - Default widgets: Campaigns, Traffic Sources, Funnels, Landers, Offers, Countries (geo map)
   - Each widget is a sortable, paginated mini-table
   - Shows: Name, Visits, Clicks, Conversions, Revenue, Cost, P/L, ROI
   - Click row → navigate to Quickview for that entity
   - Widgets are rearrangeable (drag-drop grid layout)

4. **Date Range Picker** — Shared component (see §8.1)

5. **Timezone Selector** — Dropdown of available timezones

#### User Interactions
- Change date range → reload all data
- Change timezone → reload all data
- Toggle chart metric → show/hide line on chart (client-side)
- Click widget row → navigate to `/quickview?groupBy=campaign&id=123`
- Paginate widget → re-fetch widget data with offset
- Sort widget column → re-fetch with sort params
- Refresh button → reload all data

---

### 5.2 Drilldown Reports (Tree)

**Route**: `/reports/tree`

**Purpose**: Multi-dimensional analytics with expandable tree rows. The primary reporting interface.

#### API Calls

| Endpoint | Method | When Called | Purpose |
|----------|--------|------------|---------|
| `POST /stats/reporting/drilldown/` | POST | Page load, filter change, expand row | Fetch report data |
| `GET /ui/drilldowns/load/` | GET | Page load | Load saved report views |
| `POST /ui/drilldowns/view/save/` | POST | Save view | Save report configuration |
| `DELETE /ui/drilldowns/view/delete/` | DELETE | Delete view | Delete saved view |
| `POST /stats/reporting/export/csv/` | POST | Export click | Export to CSV |

**Drilldown Request**:
```json
{
  "timeRange": { "start": "2024-01-01T00:00:00Z", "end": "2024-01-31T23:59:59Z" },
  "timeZone": { "name": "UTC" },
  "groupings": [
    { "groupBy": "Element: Campaign", "whitelistFilters": [], "blacklistFilters": [] },
    { "groupBy": "Element: Funnel" }
  ],
  "paging": { "start": 0, "length": 50 },
  "sorting": { "sortingColumns": [{ "columnName": "Entrances", "order": "desc" }] },
  "columnFilters": { "filterColumns": [] },
  "options": {
    "viewType": "tree",
    "showArchivedAssets": false,
    "showFilteredTraffic": false,
    "computeCTRConfidenceRate": false,
    "computeCVRConfidenceRate": false
  }
}
```

**Drilldown Response**:
```json
{
  "columns": [
    { "name": "Campaign", "type": "grouping" },
    { "name": "Entrances", "type": "metric" },
    { "name": "Clicks", "type": "metric" },
    ...
  ],
  "rows": [
    {
      "rowId": "123",
      "cells": [
        { "formatted": "Campaign A", "raw": "123" },
        { "formatted": "1,234", "raw": 1234 },
        ...
      ],
      "children": [],
      "parentRowId": null
    }
  ],
  "totals": { "cells": [...] },
  "rowsReturned": 10,
  "rowsTotal": 100
}
```

#### Available Groupings
- Element: Campaign, Funnel, Lander, Offer, Traffic Source, Offer Source
- Geo: Continent, Country, Region, City, Language
- Device: Device Type, Device Brand, Device Model, OS, OS Version, Browser
- Network: ISP, Mobile Carrier, Connection Type, IP
- Time: Day, Week, Month, Hour, Day of Week
- Other: Referrer, Tracking Field 1-10, Conversion Path, Hit ID

#### UI Components

1. **Toolbar**:
   - Date range picker
   - Timezone selector
   - Saved views dropdown + save/delete buttons
   - Export CSV button
   - Column visibility toggle
   - Refresh button

2. **Groupings Selector**:
   - Multi-select for up to 10 grouping levels
   - Each grouping level shows as a tag/chip
   - Order matters (determines tree hierarchy)
   - Cascading filters: each level can have whitelist/blacklist

3. **Tree Grid Table**:
   - Expandable rows (click arrow to show children)
   - Expanding a row fetches child data with parent filter applied
   - Infinite scroll or pagination
   - Sortable columns
   - Column header filters (text input for filtering)
   - Totals row pinned at bottom
   - Confidence rate badges (colored indicators for statistical significance)

4. **Stats Columns** (standard set):
   - Entrances, Total Clicks, Unique Clicks, Lander Clicks, Offer Clicks
   - Conversions, Revenue, Cost, Profit/Loss, ROI, EPV, CPE
   - CTR, CVR (with optional confidence badges)
   - Filtered Entrances (optional)

#### User Interactions
- Add/remove/reorder groupings → reload data
- Expand tree row → fetch children with parent filter
- Sort column → reload with sort params
- Filter column → reload with column filter
- Change date/timezone → reload all
- Save view → save current groupings + filters config
- Load saved view → apply groupings + filters, reload
- Export CSV → download file

---

### 5.3 Drilldown Reports (Flat)

**Route**: `/reports/flat`

Identical to Tree except:
- `viewType: "flat"` in request
- No expandable rows — all combinations shown as separate rows
- Simpler table without tree indentation

---

### 5.4 Campaign List

**Route**: `/campaigns`

**Purpose**: List all campaigns with funnels in a tree table showing stats.

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /stats/reporting/drilldown/` | POST | Load campaign/funnel stats in tree format |
| `GET /data/campaign/list/` | GET | Get campaign names for dropdowns |
| `POST /data/campaign/clone/` | POST | Clone campaign |
| `DELETE /data/campaign/delete/` | DELETE | Delete campaign |
| `POST /data/campaign/funnel/clone/` | POST | Clone funnel |
| `DELETE /data/campaign/funnel/delete/` | DELETE | Delete funnel |
| `POST /data/campaign/funnel/move/` | PUT | Move funnel to different campaign |

#### UI Components

1. **Toolbar**:
   - "Add New Campaign" button → opens Campaign Edit
   - Date range picker
   - Traffic source filter dropdown
   - Expand All / Collapse All buttons

2. **Tree Table**:
   - Level 1: Campaigns (expandable)
   - Level 2: Funnels within each campaign
   - Columns: Name + all stats columns
   - Per-row actions menu: Edit, Clone, Delete, Archive

3. **Context Actions** (per row):
   - **Campaign**: Edit, Clone, Delete, Archive/Restore
   - **Funnel**: Edit (opens visual editor), Clone, Move (to different campaign), Delete, Archive/Restore

#### User Interactions
- Click campaign name → expand to show funnels
- Click funnel name → navigate to funnel editor
- Clone campaign → deep-clones all child funnels
- Move funnel → shows campaign picker dropdown
- Archive → removes from list (toggle to show archived)
- Delete → confirmation dialog → soft delete

---

### 5.5 Campaign Edit

**Route**: `/campaigns/:id/edit` or `/campaigns/new`

**Purpose**: Edit campaign name, notes, and advanced settings.

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/campaign/find/byId/` | GET | Load campaign |
| `GET /data/campaign/find/byName/` | GET | Check duplicate name |
| `POST /data/campaign/save/` | POST | Create campaign |
| `PUT /data/campaign/save/` | PUT | Update campaign |

#### UI Components (Form)

1. **Basic Fields**:
   - Campaign Name (required, unique)
   - Campaign ID (read-only if editing)
   - Notes (textarea)

2. **Advanced Settings** (collapsible accordion):
   - **Custom Tokens**: One per line, format `token=value`. Used in conditions and code nodes.
   - **Accumulate URL Params**: Query string format `p1=val1&p2=val2`. Appended to all outgoing URLs.

#### Data Model
```typescript
interface Campaign {
  idCampaign: string;
  campaignName: string;
  notes: string;
  urlSuffix: string;          // accumulated URL params
  customTokens: KeyValuePair[];
  isArchived: boolean;
}
```

---

### 5.6 Funnel Editor (Visual)

**Route**: `/campaigns/:campaignId/funnels/:funnelId/edit` or `/campaigns/:campaignId/funnels/new`

**Purpose**: Visual drag-and-drop funnel builder. **This is the most complex page in the app.**

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/campaign/funnel/find/byId/` | GET | Load funnel with nodes & connections |
| `GET /data/campaign/funnel/find/byName/` | GET | Check duplicate name |
| `POST /data/campaign/funnel/save/` | POST | Save funnel (creates nodes/connections) |
| `PUT /data/campaign/funnel/save/` | PUT | Update funnel |
| `GET /data/campaign/funnel/condition/list/` | GET | Load conditions for dropdown |
| `GET /data/campaign/funnel/codesnippet/list/` | GET | Load code snippets for dropdown |
| `GET /data/campaign/list/` | GET | Campaign dropdown |
| `GET /system/domain/list/` | GET | Domain dropdown |
| `POST /stats/reporting/drilldown/` | POST | Heatmap stats overlay |

#### UI Components

1. **Top Form**:
   - Funnel Name (required)
   - Campaign selector (dropdown)
   - Default Cost per Entrance
   - Funnel ID (read-only)
   - Notes

2. **Visual Canvas** — The funnel diagram:
   - **Drag-and-drop node placement**
   - **Node types** (each has distinct visual style):
     - **Root Node** — Entry point (always present, cannot be deleted)
     - **Rotator** — Traffic splitter with weight distribution
     - **Lander** — Landing page (blue-ish)
     - **Offer** — Offer page (green-ish)
     - **External URL** — Redirect to arbitrary URL
     - **Condition** — Rule-based routing
     - **JS Code** — Execute JavaScript
     - **PHP Code** — Execute PHP
     - **Visitor Tag** — Tag the visitor
   - **Connections**: Directed arrows between nodes
     - Action numbers on connections
     - Weight labels for rotator connections
   - **Context menus** (right-click) — 5 distinct menus:
     - **Canvas background**: Add Offers (multi-select), Add Landers (multi-select), Add External URL, Add Rotator, Add Condition, Advanced → (Visitor Tags, JS Code, PHP Code)
     - **Root node**: Send Traffic Here (opens link generator)
     - **Regular node**: Send Traffic Here, Delete This Node
     - **Page node (Lander/Offer)**: Send Traffic Here, Edit This Page (opens modal), Delete This Node
     - **Connection label**: Get Action's URL (copy), Delete This Connection
   - **Connection labels**: Draggable along the edge; show percentage (rotator) or "ON ACTION N" (page) or "YES"/"NO" (condition)
   - **Heatmap overlay**: Dropdown selector above canvas. Overlays per-node stats with color coding. Metrics include: Views, Unique Views, Conversions, CVR, EPV, Revenue (Direct/Lifetime), Lander/Offer Unique Clicks

3. **Advanced Settings** (collapsible accordion, shows `*edited*` in red when modified):
   - **Tab 1: Custom Configuration**: Custom Tokens textarea (key=value per line), Accumulate URL Params text input
   - **Tab 2: Cost Overrides**: Dynamic rows of Traffic Source dropdown + Cost per Entrance input + remove button. "Add Another" button
   - **Tab 3: Postback Overrides**: Dynamic rows of Traffic Source + Postback Type (none/postbackUrl/pixelUrl/javascript) + Postback Code input

4. **Quick Stats Table** (below canvas):
   - Stats for this funnel filtered by date range
   - Uses drilldown API with funnel filter

#### Data Model
```typescript
interface Funnel {
  idFunnel: string;
  idCampaign: string;
  funnelName: string;
  defaultCostPerEntrance: number;
  canvasWidth: number;
  canvasHeight: number;
  nodes: FunnelNode[];
  connections: FunnelConnection[];
  acculumatedUrlParams: KeyValuePair[];
  customTokens: KeyValuePair[];
  incomingTrafficCostOverrides: KeyValuePair[];
  postbackOverrides: Postback[];
  isArchived: boolean;
}

interface FunnelNode {
  idNode: string;
  idFunnel: string;
  nodeType: number;  // 0=root, 1=rotator, 2=lander, 3=offer, 4=externalURL, 5=jsCode, 6=phpCode, 7=condition, 8=visitorTag
  nodeName: string;
  nodeParams: Record<string, any>;  // Type-specific params (see node type details below)
  percentPosX: number;  // 0.0-1.0 position on canvas (percentage)
  percentPosY: number;
  isArchived: boolean;
}

interface FunnelConnection {
  idConnection: string;
  idFunnel: string;
  idSourceNode: string;
  idTargetNode: string;
  weight: number;        // For rotators
  elementData: Record<string, any>;
}
```

#### Heatmap Metric Types
- Visits, Unique Visits, Conversions, CVR, EPV, Revenue
- Direct Revenue, Lifetime Revenue
- Lander Unique Clicks, Offer Unique Clicks

#### Key Interactions
- **Add node**: Right-click canvas → select type → node appears at cursor
- **Connect nodes**: Drag from source endpoint → drop on target endpoint
- **Move node**: Drag node to new position (stored as percentage)
- **Edit node**: Double-click → opens appropriate editor (page edit, condition edit, etc.)
- **Delete node/connection**: Right-click → Delete
- **Save**: Serializes all nodes + connections → single API call
- **Heatmap toggle**: Select metric → fetch stats → apply color gradient to nodes

#### Recommended React Library
**React Flow** (https://reactflow.dev/) — purpose-built for node/edge diagrams with:
- Custom node components per type
- Connection validation
- Drag-and-drop
- Minimap
- Zoom/pan
- TypeScript support

---

### 5.7 Condition Editor

**Route**: Modal/drawer within Funnel Editor (or standalone at `/conditions/:id/edit`)

**Purpose**: Build complex AND/OR routing logic.

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/campaign/funnel/condition/find/byId/` | GET | Load condition |
| `POST /data/campaign/funnel/condition/save/` | POST | Save condition |

#### UI Components

1. **Header**: Condition Name, Scope toggle (funnel-local or global), Copy From dropdown

2. **Logic Builder** — Visual AND/OR block builder:
   ```
   IF (
     [Country] [equals] [US, CA, UK]          ← Rule 1
     AND [Device Type] [equals] [Mobile]       ← Rule 2
   )
   OR (
     [Custom Token] [contains] [premium*]      ← Rule 3
   )
   ```

3. **Each Rule Contains**:
   - Field selector: Country, Region, City, Language, ISP, Device Type, OS, Browser, IP, Referrer, Custom Token, Tracking Fields, Visit Time, Day of Week, etc.
   - Operator: equals, not equals, contains, not contains, greater than, less than, is known, is unknown
   - Value input (varies by field): multi-select for enums, text for free-form, time pickers for time fields
   - "Include Unknown" toggle

4. **Block Controls**:
   - "AND..." button → add rule to current block
   - "OR..." button → add new block
   - Remove icons on each rule/block

#### Data Model
```typescript
interface Condition {
  idCondition: string;
  conditionName: string;
  conditionScope: string;  // funnelId or "0" for global
  conditionBlocks: ConditionBlock[];
}

type ConditionBlock = ConditionRule[];  // Rules within a block are AND

interface ConditionRule {
  field: string;
  operator: string;
  value: string | string[];
  includeUnknown: boolean;
}
// Blocks are OR'd together: (block1) OR (block2) OR ...
```

---

### 5.8 Landers List

**Route**: `/landers`

**Purpose**: List all landing pages with stats and bulk actions.

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /stats/reporting/drilldown/` | POST | Stats for landers (groupBy: lander) |
| `GET /data/page/list/?pageType=lander` | GET | List landers for dropdowns |
| `GET /data/page/category/list/` | GET | List categories |
| `POST /data/page/clone/` | POST | Clone lander |
| `DELETE /data/page/delete/` | DELETE | Delete lander |
| `PUT /data/page/archive/` | PUT | Archive/unarchive |
| `POST /data/page/deleteBulk/` | POST | Bulk delete |
| `POST /data/page/category/assign/` | POST | Bulk assign to category |
| `POST /data/page/import/csv/` | POST | CSV import |

#### UI Components

1. **Toolbar**:
   - "Add New Lander" button → opens Lander Edit
   - "CSV Import" button → file upload modal
   - Bulk actions dropdown: Move to Category, Archive, Restore, Delete
   - Date range picker
   - Category filter (optional)

2. **Stats Table**:
   - Tree grouping by category (Category → Landers)
   - Columns: Name, all stats columns
   - Row selection checkboxes for bulk actions
   - Per-row actions: Edit, Clone, Delete, Archive

---

### 5.9 Lander Edit

**Route**: `/landers/:id/edit` or `/landers/new`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/page/find/byId/` | GET | Load lander |
| `GET /data/page/find/byName/` | GET | Check duplicate name |
| `POST /data/page/save/` | POST | Create lander |
| `PUT /data/page/save/` | PUT | Update lander |
| `GET /data/page/category/list/` | GET | Category dropdown |

#### UI Components (Form)

1. **Basic Fields**: Name (required), Category dropdown + Create button, ID (read-only)
2. **URL**: Page URL (required), external link preview
3. **Redirect Type**: Dropdown (302 redirect, meta refresh, double-meta, etc.)
4. **Notes**: Textarea
5. **Advanced Settings** (collapsible):
   - Cache Page toggle
   - Hide From Direct Traffic toggle
   - Link Rewriter: toggle + URL mapping table (from → to pairs)
   - Content Rewriter: toggle + HTML content mapping table
   - Prevent Video Autoplay toggle
   - Disable Exit Popups toggle
   - Break Analytics toggle
   - Spoof Referrer & User Agent: toggle + lists

#### Data Model
```typescript
interface Page {
  idPage: string;
  pageType: "lander" | "offer";
  pageName: string;
  categoryId: string;
  url: string;
  redirectType: number;
  notes: string;
  payoutAmount: number;       // offers only
  payoutAmountType: string;   // offers only
  affiliateNetworkId: string; // offers only
  cachePage: boolean;
  hideFromDirectTraffic: boolean;
  enableLinkRewriter: boolean;
  enableContentRewriter: boolean;
  enableAutoplayBreaker: boolean;
  enableExitPopupBreaker: boolean;
  enableAnalyticsBreaker: boolean;
  enableSpoofing: boolean;
  urlMapperList: { from: string; to: string; isFunnel: boolean }[];
  htmlContentMapperList: { from: string; to: string }[];
  protectedURLs: string;
  headerCodeInjection: string;
  footerCodeInjection: string;
  spoofReferrerList: string;
  spoofUserAgentList: string;
  isArchived: boolean;
}
```

---

### 5.10 Offers List

**Route**: `/offers`

Identical structure to Landers List but with `pageType=offer` and dimension `OFFERS`. Shows payout column.

---

### 5.11 Offer Edit

**Route**: `/offers/:id/edit` or `/offers/new`

Same as Lander Edit plus:
- **Default Payout** field (amount + type: fixed/percentage)
- **Offer Source** dropdown (affiliate network) + Create button
- **Postback Info** (read-only): Subid field and postback URL generated from offer source config

---

### 5.12 Traffic Sources List

**Route**: `/traffic-sources`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /stats/reporting/drilldown/` | POST | Stats for traffic sources |
| `GET /data/trafficsource/list/` | GET | List for dropdowns |
| `POST /data/trafficsource/clone/` | POST | Clone |
| `DELETE /data/trafficsource/delete/` | DELETE | Delete |
| `PUT /data/trafficsource/archive/` | PUT | Archive/unarchive |
| `POST /data/trafficsource/deleteBulk/` | POST | Bulk delete |
| `GET /data/trafficsource/category/list/` | GET | Categories |
| `POST /data/trafficsource/category/assign/` | POST | Assign to category |

#### UI Components
Same pattern as Landers List: toolbar, stats tree table by category, bulk actions, per-row actions.

---

### 5.13 Traffic Source Edit

**Route**: `/traffic-sources/:id/edit` or `/traffic-sources/new`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/trafficsource/find/byId/` | GET | Load |
| `POST /data/trafficsource/save/` | POST | Create |
| `PUT /data/trafficsource/save/` | PUT | Update |
| `GET /data/trafficsource/template/list/` | GET | List templates |
| `GET /data/trafficsource/template/load/` | GET | Load template |

#### UI Components (Form)

1. **Basic Fields**: Name, Category, ID
2. **Template Selector**: "Copy from template" dropdown (37 pre-configured templates for Facebook, Google, TikTok, etc.)
3. **Tracking Variables**: Dynamic list of Field Name / URL Token pairs (up to 64). Each row has remove button. "Add Another" button.
4. **Cost Settings**: Default Cost per Entrance, Cost Type (CPE/CPA)
5. **Postback Configuration**: Type (URL/Pixel/Full Code), conditional fields based on type
6. **Notes**: Textarea

#### Data Model
```typescript
interface TrafficSource {
  idTrafficSource: string;
  trafficSourceName: string;
  categoryId: string;
  defaultCostPerEntrance: number;
  costType: string;
  postbackType: string;  // "url" | "pixel" | "fullcode"
  postbackCode: string;
  notes: string;
  urlParams: { field: string; token: string }[];
  isArchived: boolean;
}
```

---

### 5.14 Offer Sources List

**Route**: `/offer-sources`

Simpler list (no categories, no bulk actions). Same pattern: stats table, per-row Edit/Clone/Delete/Archive.

#### API Calls
- `POST /stats/reporting/drilldown/` — stats
- `POST /data/offersource/clone/` — clone (needs new V2 endpoint)
- `DELETE /data/offersource/delete/` — delete (needs new V2 endpoint)

---

### 5.15 Offer Source Edit

**Route**: `/offer-sources/:id/edit` or `/offer-sources/new`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/offersource/find/byId/` | GET | Load |
| `POST /data/offersource/save/` | POST | Create |
| `PUT /data/offersource/save/` | PUT | Update |
| `GET /data/offersource/template/list/` | GET | Templates |
| `GET /data/offersource/template/load/` | GET | Load template |

#### UI Components (Form)
1. **Basic Fields**: Name, ID
2. **Template Selector**: Pre-configured templates for popular networks (41 templates)
3. **URL Configuration**: Subid parameter name, Query separator
4. **Postback Configuration**: Subid placeholder, Transaction ID placeholder, Payout placeholder
5. **Auto-generated Postback URL** (read-only, updates live as fields change)
6. **Notes**: Textarea

#### Data Model
```typescript
interface OfferSource {
  idOfferSource: string;
  offerSourceName: string;
  subId: string;
  querySeparator: string;
  postbackSubId: string;
  postbackTxId: string;
  postbackPayout: string;
  notes: string;
}
```

---

### 5.16 System Links (Generate)

**Route**: `/links/generate`

**Purpose**: Generate tracking URLs, action click URLs, and conversion postback URLs.

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET` or `POST` `/system/links/entrance/` | Generate tracking URL |
| `GET` or `POST` `/system/links/action/` | Generate action click URL |
| `GET` or `POST` `/system/links/no-redirect-js/` | Generate universal JS |
| `GET /system/domain/list/` | GET | Domain dropdown |
| `GET /data/campaign/list/` | GET | Campaign dropdown |
| `GET /data/campaign/funnel/list/` | GET | Funnel dropdown (filtered by campaign) |

#### UI Components — Multi-Step Wizard

1. **Step 1**: Select Campaign (dropdown)
2. **Step 2**: Select Funnel (dropdown, filtered by campaign)
3. **Step 3**: Select Node (dropdown, filtered by funnel)
4. **Step 4**: Select Traffic Source (dropdown)
5. **Step 5**: Enter Cost per Entrance/Action
6. **Step 6**: Select Domain (dropdown)
7. **Result**: Generated Tracking URL (with copy button)
8. **Optional**: Universal JS toggle + code display (for lander nodes)
9. **Action Click URL**: Action number input → generated URL
10. **Conversion Postback URLs**: URL template, Pixel HTML, iFrame HTML (each with copy button)

Dropdowns cascade: Campaign → filters Funnels → filters Nodes.

---

### 5.17 Stored Links

**Route**: `/links/stored`

**Purpose**: Manage saved tracking links with optional tags and visit tracking.

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /ui/storedlinks/load/` | GET | Load stored links |
| `DELETE /ui/storedlinks/delete/` | DELETE | Delete link |

#### UI Components
1. **Toolbar**: "New Stored Link" button, "Show only with traffic" checkbox, Date range picker
2. **Table**: Link Name, Notes, Tags (editable multi-select), Visits count
3. **Per-row actions**: Edit, Clone, Delete, Copy URL, Reset Visits

---

### 5.18 Stored Link Edit

**Route**: `/links/stored/:id/edit` or `/links/stored/new`

Same cascade wizard as System Links, plus:
- Link Name input (required, alphanumeric/dash/underscore)
- Custom URL input (can be manually entered or generated)

---

### 5.19 System Settings

**Route**: `/settings`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /ui/systemsettings/load/` | GET | Load all settings |
| `POST /ui/systemsettings/save/` | POST | Save setting |
| `GET /system/domain/list/` | GET | Domain list |
| `POST /system/domain/save/` | POST | Create domain |
| `PUT /system/domain/save/` | PUT | Update domain |
| `DELETE /system/domain/delete/` | DELETE | Delete domain |
| `PUT /system/domain/default/` | PUT | Set default domain |

#### UI Components (Form)

| Field | Type | Description |
|-------|------|-------------|
| Default Drilldown | Dropdown | Tree or Flat |
| Default Home Page URL | Text | Where tracker root redirects |
| Default Offer Redirect | Dropdown | Redirect type for offers |
| Default Lander Redirect | Dropdown | Redirect type for landers |
| Threshold % for Winners | Text | Confidence rate threshold (default 95%) |
| IP Anonymizer | Dropdown | All IPs / EU IPs / Disabled |
| API Key | Text | V2 API authentication key |
| ClickBank Secret Key | Text | For ClickBank integration |
| License Key | Read-only | With "Assign New" button |
| Default Domain | Dropdown | With Create/Edit/Delete |
| Force HTTPS | Toggle | Force all URLs to HTTPS |
| Auto-expand Campaigns | Toggle | Auto-expand campaign rows in list |

---

### 5.20 Traffic Filters List

**Route**: `/settings/traffic-filters`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/trafficfilter/find/byStatus/` | GET | List all filters |
| `DELETE /data/trafficfilter/delete/` | DELETE | Delete filter |
| `POST /data/trafficfilter/applyRetroactively/` | POST | Apply/remove retroactively |

#### UI Components
1. **Table**: Filter Name, Status (enabled/disabled), Condition summary, Action summary
2. **Per-row actions**: Edit, Delete, Apply Retroactively / Unfilter Retroactively

---

### 5.21 Traffic Filter Edit

**Route**: `/settings/traffic-filters/:id/edit` or `/settings/traffic-filters/new`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/trafficfilter/find/byId/` | GET | Load filter |
| `POST /data/trafficfilter/save/` | POST | Save filter |

#### UI Components (Form)

1. **Name**: Text input
2. **Condition Type**: Dropdown — IP Address, IP Range, Referrer, User Agent, ISP, Country, Known Bots
3. **Condition Value** (varies by type):
   - IP/IP Range: Textarea(s) for IP addresses
   - Referrer/UA/ISP: Textarea (one per line)
   - Country: Multi-select
   - Known Bots: No input needed
4. **Action**: Dropdown — Hide from stats, Hide & Redirect (+ URL input)
5. **Status**: Toggle (enabled/disabled)

---

### 5.22 Global Conditions

**Route**: `/settings/conditions`

Simple list of globally-scoped conditions. Click to edit opens Condition Editor (§5.7).

#### API Calls
- `GET /data/campaign/funnel/condition/list/?scope=global` — list
- Edit uses same condition save/load endpoints

---

### 5.23 Visitor Tags

**Route**: `/settings/tags`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /data/tag/list/` | GET | List tags |
| `POST /data/tag/save/` | POST | Create tags |
| `PUT /data/tag/update/` | PUT | Rename tag |

#### UI Components
- Simple table: Tag Name, ID
- "Add New Tag" button → name input modal
- Edit icon → rename modal

---

### 5.24 Access Log

**Route**: `/settings/access-log`

Read-only security audit table.

#### API Calls
- `GET /ui/accesslog/load/` — load events

#### UI Components
- Table: IP, Country, Date, User, Event (login/logout)
- Sorted newest first
- Search filter

---

### 5.25 User Management List

**Route**: `/settings/users` (admin only)

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /ui/usermanagement/load/` | GET | List users |
| `DELETE /ui/usermanagement/delete/` | DELETE | Delete user |

#### UI Components
- Table: ID, Name, Email, Admin Privileges, Status, Archive
- Per-row actions: Edit, Archive, Delete, Restore
- "New User" button

---

### 5.26 User Management Edit

**Route**: `/settings/users/:id/edit` or `/settings/users/new`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /ui/usermanagement/load/?id=X` | GET | Load user |
| `GET /ui/usermanagement/rights/?userId=X` | GET | Load permissions |
| `POST /ui/usermanagement/copyRights/` | POST | Copy rights from another user |
| `POST /ui/userprofile/changePassword/` | POST | Change password |

#### UI Components (Form)

1. **Basic Info**: First Name, Last Name, Email, Password, Status toggle, Admin toggle
2. **Rights Management** — Massive section with per-entity-type permission grids:
   - For each type (Campaigns, Funnels, Pages, Traffic Sources, Conditions, Filters, Tags):
     - Multi-select of specific entities
     - Rights matrix: View / Edit / Delete per entity
3. **Copy Rights**: From user dropdown, category checkboxes, Copy button

---

### 5.27 Inbox

**Route**: `/inbox`

#### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /ui/inbox/load/` | GET | Load messages |
| `GET /ui/inbox/notifications/check/` | GET | Check unread count (polled) |

#### UI Components
- Table: From, Subject + Body preview, Date
- Unread rows styled differently
- Click row → expand to read full message
- Bulk actions: Mark Read, Mark Unread, Delete

---

### 5.28 Data Updates — Conversions

**Route**: `/data-updates/conversions`

#### API Calls
- `PUT /stats/update/conversions/` — bulk update conversions

#### UI Components
1. **Postback Options**: Radio buttons — Don't fire / Fire unfired / Fire all
2. **Data Input**: Large textarea for bulk entry
3. **Format Guide**:
   - `hitId` — mark conversion
   - `hitId, payout` — with custom payout
   - `hitId:txId, payout` — with transaction ID
   - `hitId, -1` — delete conversion
4. **Submit Button**: "Update Conversions"

---

### 5.29 Data Updates — Traffic Costs

**Route**: `/data-updates/costs`

#### API Calls
- `PUT /stats/update/cost/` — update costs

#### UI Components — Multi-Step Form
1. Select Campaign → Select Funnel → Select Traffic Source
2. Date range picker
3. Optional filters: Country, Tracking Fields
4. Update method: Adjust Total Cost OR Adjust CPE
5. Value input
6. Alternate: Bulk mode with textarea (format: `COST ; FIELD ; VALUE`)

---

### 5.30 Data Updates — Reset Stats

**Route**: `/data-updates/reset`

#### API Calls
- `GET /stats/update/reset/` — count hits to delete
- `DELETE /stats/update/reset/` — execute deletion

#### UI Components
1. **Filters**: Date range, Campaign, Funnel, Traffic Source, Country, Visitor ID, other grouping fields
2. **Display**: Disk usage, Database size, Entrance count (updates dynamically)
3. **Reset Button**: Enabled only when count > 0, requires confirmation dialog

---

### 5.31 Heatmaps

**Route**: `/campaigns/:campaignId/funnels/:funnelId/heatmap`

**Purpose**: Visual statistics overlay on funnel diagram.

#### API Calls
- `GET /data/campaign/funnel/find/byId/` — load funnel structure
- `POST /stats/reporting/drilldown/` — load node-level stats

#### UI Components
1. **Heatmap type selector**: Direct Revenue, Conversions, EPV, Views, Unique Views, Flow %, etc.
2. **Funnel diagram** (read-only): Same visual as funnel editor but non-editable
3. **Stats overlay**: Each node shows selected metric value, color-coded by relative performance
4. **Stats table below**: Detailed per-node statistics
5. **Click node in diagram** → highlights in table (and vice versa)

---

### 5.32 Quickview

**Route**: `/quickview?groupBy=campaign&id=123`

**Purpose**: Quick stats breakdown for a specific entity.

#### API Calls
- `POST /stats/reporting/drilldown/` — with entity filter and selected sub-grouping

#### UI Components
1. **Filter bar**: Traffic Source, Funnel (context-dependent)
2. **Report type buttons** (3 groups):
   - Group 1: Conversion Paths, Landers, Offers, Traffic Sources, Funnels, Week/Day Parting, Historical
   - Group 2: Device Type/Name, OS, Browser, ISP, Carrier, Connection, IP, Referrer
   - Group 3: Tracking Fields, Geo (Continent/Country/Region/City), Drilldown
3. **Stats table**: Changes based on selected report type
4. **"Drilldown" button**: Navigate to full drilldown with same filters

---

### 5.33 System Updates

**Route**: `/settings/updates` (self-hosted only)

#### API Calls (all need new V2 endpoints)
- List available/installed updates
- Install update
- Rollback to version
- Poll installation status

#### UI Components
- Table: Date, Version, Notes, Installed status, Action (Install/Rollback)
- Installation progress indicator with polling

---

## 6. Complete V2 API Reference

### Data API (`/admin/api/v2/data/`)

#### Campaigns
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST | `/data/campaign/save/` | Body: Campaign object |
| PUT | `/data/campaign/save/` | Body: Campaign object |
| GET | `/data/campaign/find/byId/` | `idCampaign` |
| GET | `/data/campaign/find/byName/` | `name` (wildcard) |
| GET | `/data/campaign/find/byStatus/` | `status` |
| DELETE | `/data/campaign/delete/` | `idCampaign` |
| GET | `/data/campaign/list/` | `archived` (opt) |
| POST | `/data/campaign/clone/` | `idCampaign` |

#### Funnels
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST | `/data/campaign/funnel/save/` | Body: Funnel object |
| PUT | `/data/campaign/funnel/save/` | Body: Funnel object |
| GET | `/data/campaign/funnel/find/byId/` | `idFunnel` |
| GET | `/data/campaign/funnel/find/byName/` | `name` |
| GET | `/data/campaign/funnel/find/byStatus/` | `status` |
| DELETE | `/data/campaign/funnel/delete/` | `idFunnel` |
| GET | `/data/campaign/funnel/list/` | `idCampaign`, `archived` (opt) |
| POST | `/data/campaign/funnel/clone/` | `idFunnel` |
| PUT | `/data/campaign/funnel/move/` | `idFunnel`, `idCampaign` |

#### Funnel Nodes
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/campaign/funnel/node/save/` | Body: Node object |
| GET | `/data/campaign/funnel/node/find/byId/` | `idNode` |
| GET | `/data/campaign/funnel/node/find/byFunnel/` | `idFunnel` |
| DELETE | `/data/campaign/funnel/node/delete/` | `idNode` |

#### Funnel Connections
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/campaign/funnel/connection/save/` | Body: Connection |
| GET | `/data/campaign/funnel/connection/find/byId/` | `idConnection` |
| GET | `/data/campaign/funnel/connection/find/byFunnel/` | `idFunnel` |
| DELETE | `/data/campaign/funnel/connection/delete/` | `idConnection` |

#### Conditions
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/campaign/funnel/condition/save/` | Body: Condition |
| GET | `/data/campaign/funnel/condition/find/byId/` | `idCondition` |
| DELETE | `/data/campaign/funnel/condition/delete/` | `idCondition` |
| GET | `/data/campaign/funnel/condition/list/` | `idFunnel` (opt) |

#### Code Snippets
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/campaign/funnel/codesnippet/save/` | Body: CodeSnippet |
| GET | `/data/campaign/funnel/codesnippet/find/byId/` | `idCodeSnippet` |
| DELETE | `/data/campaign/funnel/codesnippet/delete/` | `idCodeSnippet` |
| GET | `/data/campaign/funnel/codesnippet/list/` | `codeType` (opt) |
| GET | `/data/campaign/funnel/codesnippet/template/list/` | — |
| GET | `/data/campaign/funnel/codesnippet/template/load/` | `name` |

#### Pages (Landers & Offers)
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/page/save/` | Body: Page object |
| GET | `/data/page/find/byId/` | `idPage` |
| GET | `/data/page/find/byName/` | `name` |
| GET | `/data/page/find/byStatus/` | `status` |
| GET | `/data/page/find/usage/` | `idPage` |
| DELETE | `/data/page/delete/` | `idPage` |
| GET | `/data/page/list/` | `pageType`, `categoryId` (opt), `archived` (opt) |
| POST | `/data/page/clone/` | `idPage` |
| PUT | `/data/page/archive/` | Body: `{ ids, archive }` |
| POST | `/data/page/deleteBulk/` | Body: `{ ids }` |
| POST | `/data/page/import/csv/` | Body: CSV file upload |

#### Page Categories
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| GET | `/data/page/category/list/` | `archived` (opt) |
| POST/PUT | `/data/page/category/save/` | `name`, `idCategory` (opt) |
| DELETE | `/data/page/category/delete/` | `idCategory` |
| PUT | `/data/page/category/assign/` | Body: `{ pageIds, categoryId }` |

#### Traffic Sources
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/trafficsource/save/` | Body: TrafficSource |
| GET | `/data/trafficsource/find/byId/` | `idTrafficSource` |
| GET | `/data/trafficsource/find/byName/` | `name` |
| GET | `/data/trafficsource/find/byStatus/` | `status` |
| DELETE | `/data/trafficsource/delete/` | `idTrafficSource` |
| GET | `/data/trafficsource/list/` | `archived` (opt) |
| POST | `/data/trafficsource/clone/` | `idTrafficSource` |
| PUT | `/data/trafficsource/archive/` | Body: `{ ids, archive }` |
| POST | `/data/trafficsource/deleteBulk/` | Body: `{ ids }` |
| GET | `/data/trafficsource/template/list/` | — |
| GET | `/data/trafficsource/template/load/` | `name` |

#### Traffic Source Categories
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| GET | `/data/trafficsource/category/list/` | — |
| POST/PUT | `/data/trafficsource/category/save/` | `name`, `idCategory` (opt) |
| DELETE | `/data/trafficsource/category/delete/` | `idCategory` |
| PUT | `/data/trafficsource/category/assign/` | Body: `{ tsIds, categoryId }` |

#### Offer Sources
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/offersource/save/` | Body: OfferSource |
| GET | `/data/offersource/find/byId/` | `idOfferSource` |
| GET | `/data/offersource/find/byName/` | `name` |
| DELETE | `/data/offersource/delete/` | `idOfferSource` |
| GET | `/data/offersource/template/list/` | — |
| GET | `/data/offersource/template/load/` | `name` |

#### Traffic Filters
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST/PUT | `/data/trafficfilter/save/` | Body: TrafficFilter |
| GET | `/data/trafficfilter/find/byId/` | `idTrafficFilter` |
| GET | `/data/trafficfilter/find/byStatus/` | `status` |
| DELETE | `/data/trafficfilter/delete/` | `idTrafficFilter` |
| POST | `/data/trafficfilter/applyRetroactively/` | `idTrafficFilter`, `apply` (bool) |

#### Tags
| Method | Endpoint | Parameters |
|--------|----------|-----------|
| GET | `/data/tag/list/` | — |
| POST | `/data/tag/save/` | Body: `{ names }` |
| PUT | `/data/tag/update/` | Body: `{ oldName, newName }` |

### Stats API (`/admin/api/v2/stats/`)

| Method | Endpoint | Parameters |
|--------|----------|-----------|
| POST | `/stats/reporting/drilldown/` | Body: DrilldownRequest |
| GET | `/stats/reporting/groupings/` | — |
| POST | `/stats/reporting/export/csv/` | Body: ExportRequest |
| PUT | `/stats/update/conversions/` | Body: ConversionsUpload |
| PUT | `/stats/update/cost/` | Body: CostUpload |
| GET | `/stats/update/reset/` | Body: ResetCriteria (count) |
| DELETE | `/stats/update/reset/` | Body: ResetCriteria (execute) |

### UI API (`/admin/api/v2/ui/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/ui/dashboard/load/` | Dashboard data |
| POST | `/ui/quickstats/load/` | Quickview data |
| GET | `/ui/drilldowns/load/` | Saved report views |
| POST | `/ui/drilldowns/view/save/` | Save view |
| DELETE | `/ui/drilldowns/view/delete/` | Delete view |
| GET | `/ui/systemsettings/load/` | System settings |
| POST | `/ui/systemsettings/save/` | Save setting |
| GET | `/ui/usermanagement/load/` | User list |
| DELETE | `/ui/usermanagement/delete/` | Delete user |
| GET | `/ui/usermanagement/rights/` | User permissions |
| POST | `/ui/usermanagement/copyRights/` | Copy rights |
| GET | `/ui/userprofile/load/` | User profile |
| POST | `/ui/userprofile/changePassword/` | Change password |
| GET | `/ui/inbox/load/` | Inbox messages |
| GET | `/ui/inbox/notifications/check/` | Unread count |
| GET | `/ui/accesslog/load/` | Access log |
| GET | `/ui/storedlinks/load/` | Stored links |
| GET | `/ui/misc/load/` | Misc UI data |

### System API (`/admin/api/v2/system/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/system/settings/version/` | Version number |
| GET | `/system/domain/list/` | List domains |
| GET | `/system/domain/default/` | Get default domain |
| PUT | `/system/domain/default/` | Set default domain |
| POST | `/system/domain/save/` | Create domain |
| PUT | `/system/domain/save/` | Update domain |
| DELETE | `/system/domain/delete/` | Delete domain |
| GET | `/system/links/entrance/` | Generate tracking URL |
| GET | `/system/links/action/` | Generate action URL |
| GET | `/system/links/no-redirect-js/` | Generate universal JS |

---

## 7. API Gaps — Endpoints Still Needed

These endpoints are needed by the React UI but don't exist yet in the V2 API:

### Critical

No current auth bootstrap gap. `GET /auth/session/` already exists and returns session status for the same-origin browser flow.

### Recently Completed (2026-03-25)

| Change | Details |
|--------|---------|
| `idFunnel` now optional in cost updates | `PUT /stats/update/cost/` no longer requires `idFunnel`. When omitted, cost update applies to all funnels for the traffic source. |
| MySQL cost infrastructure removed | `DBTableStHitCosts` deleted. All cost analytics are ClickHouse-only. `createUpdateCostJob()` moved to `CHTableEvents`. |
| VM roles system removed | `ROLE_REDIRECTS`, `ROLE_BACKGROUND_JOBS`, `VM_ROLES` constants and all associated logic removed. Every self-hosted server handles everything. |

### High Priority (blocks core functionality)

| Endpoint | Method | Purpose | Legacy Equivalent |
|----------|--------|---------|-------------------|
| `POST /ui/usermanagement/save` | POST | Create/update user | `saveUser` AJAX |
| `POST /ui/usermanagement/archive` | POST | Archive/restore user | `archiveUser` AJAX |
| `GET /data/offersource/list` | GET | List offer sources | `getAllRecords()` |
| `POST /data/offersource/clone` | POST | Clone offer source | `cloneAffiliateNetwork` AJAX |
| `PUT /data/offersource/archive` | PUT | Archive offer source | `archiveAffiliateNetwork` AJAX |
| `GET /ui/inbox/message/view` | GET | Load full message | `getMessage` AJAX |
| `POST /ui/inbox/changeStatus` | POST | Mark read/unread | `changeMessageStatus` AJAX |
| `DELETE /ui/inbox/delete` | DELETE | Delete messages | `deleteMessages` AJAX |

### Already Exists (previously thought missing)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `GET /ui/userprofile/loggedin/load/` | GET | Full user profile + RBAC permissions for session user | **EXISTS** — returns complete permissions object |

### Medium Priority (blocks secondary features)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /system/accesslog/list` | GET | Access log with geo data |
| `POST /data/conversion/bulkUpdate` | POST | Bulk update conversions (textarea format) |
| `POST /data/traffic/cost/bulkUpdate` | POST | Bulk update costs (with tracking field filters) |
| `GET /data/trafficsource/trackingFields` | GET | Get tracking fields for TS/funnel combo |
| `POST /stats/reset/count` | POST | Count entrances matching criteria |
| `POST /stats/reset/execute` | POST | Delete matching stats |

### Low Priority (self-hosted admin features)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /system/update/list` | GET | List available updates |
| `POST /system/update/install` | POST | Install update |
| `POST /system/update/rollback` | POST | Rollback version |
| `GET /system/update/status` | GET | Poll install status |
| `POST /system/links/qrcode` | POST | Generate QR code image |

---

## 8. Shared Components

### 8.1 Date Range Picker

Used on almost every page. Must support:

**Preset Periods**: Today, Yesterday, This Week, Last Week, This Month, Last Month, Last 7 Days, Last 30 Days, Last 90 Days, Custom Range

**Custom Range**: Two date inputs with calendar popup

**Timezone Selector**: Dropdown of all timezones

**Behavior**:
- On change → trigger data reload callback
- Persist selection across page navigations (localStorage or URL params)
- Show current selection as readable text: "Today (UTC)"

### 8.2 Stats Table

Reusable data table component used on all list pages and reports.

**Features**:
- Sortable columns (click header)
- Column filters (text input in header)
- Column visibility toggle
- Pagination (server-side)
- Totals row (pinned at bottom)
- Row selection (checkboxes)
- Tree grouping (expandable parent rows)
- Confidence rate badges (colored indicators)
- Column resizing

**Standard Stats Columns**:
| Column | Description |
|--------|-------------|
| Entrances | Total visits/entrances |
| Total Clicks | All clicks |
| Unique Clicks | Deduplicated clicks |
| Conversions | Total conversions |
| Revenue | Total revenue |
| Cost | Total cost |
| Profit/Loss | Revenue - Cost |
| ROI | (Revenue - Cost) / Cost * 100% |
| EPV | Earnings Per Visit |
| CPE | Cost Per Entrance |
| CTR | Click-Through Rate |
| CVR | Conversion Rate |

### 8.3 Entity Modals

Pattern: List pages open edit forms in modals/drawers rather than navigating to separate pages. The React app should use a slide-in drawer or modal pattern.

### 8.4 Confirmation Dialog

Used before destructive actions (delete, reset, archive). Shows entity name and requires explicit confirmation.

### 8.5 Toast/Notification

- Success: Green toast on save/create/delete
- Error: Red toast on API failure
- System notification: Modal popup for important system messages

### 8.6 Loading States

- Page-level: Full-page spinner during initial load
- Component-level: Skeleton loaders for tables/charts
- Action-level: Button spinner during save/delete

---

## 9. Tech Stack (Decided — Already In Use)

The `funnelflux-open-ui` repo already uses these libraries. This is not a recommendation — it's the current state.

### Core
| Library | Version | Purpose |
|---------|---------|---------|
| **Vite** | 8.0 | Build tool (NOT Next.js — pure SPA, no SSR needed) |
| **React** | 19.2 | UI framework |
| **TypeScript** | 5.9 | Type safety |
| **React Router** | 7.13 | Client-side routing (BrowserRouter, basename="/v2-ui") |

### UI & Styling
| Library | Version | Purpose |
|---------|---------|---------|
| **Tailwind CSS** | 4.2 | Utility-first styling with CSS variables for theming |
| **shadcn/ui** | — | 30+ pre-built Radix-based components (button, dialog, select, tabs, etc.) |
| **Radix UI** | — | Accessible primitives (accordion, dialog, dropdown, popover, etc.) |
| **Lucide React** | 0.577 | Icon library |

### Data & State
| Library | Version | Purpose |
|---------|---------|---------|
| **TanStack React Query** | 5.90 | Server state management with caching (staleTime: 30s) |
| **Zustand** | 5.0 | Client state (auth, dashboard prefs, drilldown filters) |
| **React Hook Form** | 7.71 | Form handling |
| **Zod** | 4.3 | Schema validation (schemas exist for campaign, page, traffic source, etc.) |

### Tables & Charts
| Library | Version | Purpose |
|---------|---------|---------|
| **TanStack React Table** | 8.21 | Headless data table with tree support, sorting, filtering |
| **TanStack React Virtual** | 3.13 | Virtual scrolling for large lists |
| **Recharts** | 3.8 | Time-series charts (dashboard) |

### Funnel Editor
| Library | Version | Purpose |
|---------|---------|---------|
| **React Flow** | **NOT YET INSTALLED** | Must `npm install @xyflow/react` — purpose-built for node/edge diagrams |

### Other
| Library | Version | Purpose |
|---------|---------|---------|
| **react-day-picker** | 9.14 | Calendar/date range picker |
| **date-fns** | 4.1 | Date formatting with timezone support (@date-fns/tz) |
| **downshift** | 9.3 | Combobox primitives |
| **cmdk** | 1.1 | Command palette |
| **class-variance-authority** | 0.7 | Component variant management |

---

## 10. Current State of the React UI

The `funnelflux-open-ui` repo already has substantial scaffolding. Here's what exists vs what's missing.

### Already Built (Scaffolded — Needs Functional Completeness)

| Area | Status | Notes |
|------|--------|-------|
| **Project setup** | Done | Vite 8 + React 19 + TypeScript + Tailwind + shadcn/ui |
| **API client** | Done | Custom `ApiClient` class with `credentials: 'same-origin'`, centralized `queryKeys` factory |
| **Auth flow** | Done | `AuthGate` wrapper, session check, user profile load, permission-based route guards |
| **Layout shell** | Done | `AppLayout` + `Navbar` with all nav items |
| **Routing** | Done | React Router 7 with all routes defined |
| **Zustand stores** | Done | Auth, dashboard, drilldown stores |
| **API hooks** | Done | 20+ custom hooks (useCampaigns, useFunnels, usePages, etc.) |
| **Zod schemas** | Done | Campaign, page, traffic source, offer source, traffic filter, system settings |
| **Shared components** | Done | DataTable, TreeDataTable, DateRangePicker, TimezoneSelector, SearchInput, MultiSelect, RowActionsMenu, ConfirmDialog, EmptyState, PageHeader, LoadingPage, Toaster, ArchiveToggle |
| **Dashboard** | Partial | Stats cards + chart + data table. Needs: world map, proper widget grid, live stats banner |
| **Campaigns** | Partial | List with CRUD + clone + stats. Needs: full tree table (Campaign>Funnel hierarchy), inline action icons matching legacy UI, column filter row |
| **Landers** | Placeholder | Basic page shell only. Needs: full CRUD, category tree, CSV import, bulk actions |
| **Offers** | Placeholder | "Coming soon". Needs everything |
| **Traffic Sources** | Partial | List with CRUD. Needs: templates, tracking fields editor, postback config, category grouping |
| **Offer Sources** | Partial | List with CRUD. Needs: templates, postback preview |
| **Links** | Partial | System links + stored links pages exist. Needs: cascade wizard, copy buttons, JS embed mode |
| **Reports** | Partial | Tree + flat drilldown pages exist. Needs: proper cascading grouping selector, saved views, export |
| **Settings** | Partial | System settings, tags, traffic filters, users, access log pages exist. Need full form fields |
| **Data Updates** | Partial | Conversions, cost, reset pages exist. Need full form logic |
| **Inbox** | Partial | Message list exists. Needs: read/unread, bulk actions |

### Not Yet Built (Major Gaps)

| Area | Effort | Notes |
|------|--------|-------|
| **Funnel Builder** | HIGH | The most complex page. Needs ReactFlow installation + 9 custom node types + connection logic + context menus + heatmap overlay + dirty state tracking. See §5.6 for full spec and `docs/ADMIN_UI_SPEC.md` for exhaustive detail. |
| **Condition Editor** | MEDIUM | AND/OR logic block builder. Used within funnel editor and global conditions page |
| **QuickView** | MEDIUM | Quick stats breakdown page with grouping buttons. Currently no dedicated page |
| **Heatmap Overlay** | MEDIUM | Stats overlay on funnel diagram. Depends on funnel builder |
| **Category Management** | LOW | Category tree for landers, offers, traffic sources. Create/rename/delete/assign |
| **CSV Import** | LOW | File upload + parse for landers/offers |
| **Templates** | LOW | Pre-configured traffic source and offer source templates |

### What the Open-UI Repo Needs From This Repo

The React UI agent needs to understand:

1. **This document** — the master spec
2. **`docs/ADMIN_UI_SPEC.md`** — exhaustive breakdown of every page, field, and interaction in the legacy UI (generated 2026-03-25 from live browser walkthrough + source code analysis)
3. **`admin/api/v2/data/definition.yaml`** (77KB) — complete OpenAPI spec for all CRUD endpoints
4. **`admin/api/v2/stats/definition.yaml`** — reporting/stats endpoints
5. **`admin/api/v2/ui/definition.yaml`** — BFF endpoints
6. **`docs/FUNNEL_API_GUIDE.md`** — detailed funnel save/load API guide
7. **Auth model**: Same-origin PHP session cookie. No API keys in the browser. `credentials: 'same-origin'` on all fetch calls.
8. **ID generation**: All entity IDs (funnels, nodes, connections) are **caller-generated unsigned 64-bit integers as strings** — the React UI must generate them before POST.

---

## 11. Implementation Phases

### Phase 1: Make Existing Pages Functional (Priority)
Most pages are scaffolded but lack functional completeness. Focus on making them work end-to-end:
- Campaigns: Full tree table (Campaign > Funnel hierarchy) with all inline actions, column filters, stats
- Landers + Offers: Full CRUD with category tree, bulk actions, CSV import
- Traffic Sources: Templates, tracking fields dynamic editor, postback config
- Dashboard: World map, widget grid, live stats banner
- Reports: Cascading grouping selector, proper tree expansion, CSV export

### Phase 2: Funnel Builder (Most Complex Page)
- Install ReactFlow: `npm install @xyflow/react`
- Custom node components for all 9 types (root, rotator, lander, offer, externalURL, jsCode, phpCode, condition, visitorTag)
- Connection logic with type-specific labels (percentage, action number, yes/no)
- 5 context menus (canvas, root, regular node, page node, connection label)
- Node edit dialogs (page selector, condition editor, URL input, code editor, tag picker)
- Connection edit dialogs (percentage slider, action dropdown)
- Advanced Settings (3 tabs: custom config, cost overrides, postback overrides)
- Save/load (full funnel serialization to single API call)
- Dirty state tracking with unsaved changes warning

### Phase 3: Condition Editor + Heatmap
- AND/OR block builder UI
- Condition save/load
- Heatmap stats overlay on funnel canvas (select metric → fetch stats → color-code nodes)
- QuickView page (standalone stats with grouping buttons)

### Phase 4: Links, Data Updates, Settings Polish
- System Links cascade wizard (Campaign → Funnel → Node → Traffic Source)
- Stored Links CRUD
- Data Updates forms (conversions, cost, reset) with full field logic
- System Settings complete form
- User Management with permissions matrix
- Notification polling, inbox read/unread

### Phase 5: Polish
- Error boundaries and loading states
- Column visibility persistence (localStorage)
- Date range + timezone persistence
- Responsive layout
- Keyboard shortcuts

---

## 12. Deployment Models

### Primary: Co-located Static Files (Recommended)

```
User's Browser → Nginx → /v2-ui/ (Vite static files) → same-origin → /admin/api/v2/
```

**User setup**:
1. Create a subfolder in their web root (e.g. `v2-ui/`)
2. Clone or download the release into it
3. Add nginx location block (documented in README)

**Nginx config** (add to server block):
```nginx
location /v2-ui/ {
    alias /path/to/webroot/v2-ui/dist/;
    try_files $uri $uri/ /v2-ui/index.html;
}
```

> **Note**: Not all users use `/usr/share/nginx/html`. The README must say "your web root" and give examples for common setups. The path in the nginx `alias` must match where they actually put the files.

**Auth flow**: User logs into existing admin at `/admin/login.php` → session cookie set → navigate to `/v2-ui/` → React app calls `/admin/api/v2/auth/session/` → loads `/admin/api/v2/ui/userprofile/loggedin/load/` for the session user → fully authenticated. Zero extra credentials.

**Updates**: `cd v2-ui && git pull && npm run build` (or download latest release zip).

### Vite Config

```typescript
// vite.config.ts (already configured in funnelflux-open-ui)
export default defineConfig({
  base: '/v2-ui/',  // co-located path prefix
  plugins: [react()],  // @vitejs/plugin-react with Oxc
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    proxy: {
      '/admin/api/v2': 'http://localhost:8080'  // dev proxy to PHP backend
    }
  },
  build: {
    outDir: 'dist',
  },
})
```
