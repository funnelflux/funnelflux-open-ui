# V2 API Gap Closure Plan

This document is an execution plan for closing all gaps between the legacy AJAX layer and the V2 API, enabling a standalone React UI to be built entirely on V2 endpoints.

Items excluded: Voluum importer (deprecated), funnel heatmap overlay (frontend concern, can be derived from conversion path reporting).

---

## 1. Clone Endpoints

**Priority: HIGH** -- cloning is a core workflow users depend on constantly.

### 1.1 Clone Campaign

**Endpoint:** `POST /data/campaign/clone/`

**Query params:** `apiKey`, `idCampaign`

**Behavior (from legacy `cloneCampaign.php`):**
- Load the original campaign
- Deep-clone the campaign object (triggers `Campaign::__clone()`)
  - Strips any existing ` - {timestamp}` suffix from name
  - Appends ` - {microtime}` for uniqueness
  - Generates new ID via `DB::getUID()`
- Clone ALL child funnels (deep -- nodes, connections, local conditions)
  - Each funnel gets new ID, all nodes get new IDs
  - Connection source/target IDs remapped to new node IDs
  - Local conditions (scope = original funnel ID) cloned with new IDs and scope updated
  - Global conditions left as-is (referenced, not cloned)
- Wrap in transaction
- Return the new campaign ID and name

**Response:**
```json
{ "idCampaign": "new_id", "campaignName": "Original - 1234567890.1234" }
```

**Implementation notes:**
- Reuse `CampaignFunnel::__clone()` which already handles the deep node/connection/condition cloning
- Call `DBTableCampaignFunnels::saveFunnel($clonedFunnel, true)` which saves nodes+connections
- Call `DBTableCampaignFunnelPaths::generate()` for each cloned funnel

### 1.2 Clone Funnel

**Endpoint:** `POST /data/campaign/funnel/clone/`

**Query params:** `apiKey`, `idFunnel`

**Behavior (from legacy `cloneFunnel.php`):**
- Load the funnel with all nodes and connections
- Deep-clone via `CampaignFunnel::__clone()`:
  - New funnel ID via `DB::getUID()`
  - Name gets ` - {microtime}` suffix
  - Each node gets new ID; old->new mapping built
  - Each connection gets new ID; source/target remapped
  - Local conditions cloned (new ID, scope = new funnel ID)
  - Global conditions left unchanged
- Save funnel with all dependencies
- Regenerate funnel paths

**Response:**
```json
{ "idFunnel": "new_id", "funnelName": "Original - 1234567890.1234" }
```

### 1.3 Clone Page

**Endpoint:** `POST /data/page/clone/`

**Query params:** `apiKey`, `idPage`

**Behavior:**
- Load the page
- Deep-clone: new ID via `DB::getUID()`, name gets ` - {microtime}` suffix
- Deep-copy all nested objects (conversion rules, tokens) via serialize/unserialize
- Save cloned page

**Response:**
```json
{ "idPage": "new_id", "pageName": "Original - 1234567890.1234" }
```

**Note:** The legacy codebase has no dedicated `clonePage.php` handler visible, but the pattern is consistent with the other clone operations. Check if `FluxPage` has a `__clone()` method; if not, create one following the same serialize/unserialize deep-copy pattern.

### 1.4 Clone Traffic Source

**Endpoint:** `POST /data/trafficsource/clone/`

**Query params:** `apiKey`, `idTrafficSource`

**Behavior (from legacy `cloneTrafficSource.php`):**
- Load the traffic source
- Deep-clone via `TrafficSource::__clone()`:
  - ID set to `null` (generated on save via `DB::getUID()`)
  - Name gets ` - {microtime}` suffix
  - URL parameters deep-copied, their IDs cleared
- Save with `DBTableTrafficSources::save($ts, true)` (true = save URL params)

**Response:**
```json
{ "idTrafficSource": "new_id", "trafficSourceName": "Original - 1234567890.1234" }
```

---

## 2. Lightweight List Endpoints

**Priority: HIGH** -- every dropdown, select menu, and autocomplete in the UI needs these.

The current V2 `find/byStatus` endpoints return full entity objects with all nested data. For dropdown menus, we only need `[{id, name}]`. These slim endpoints reduce payload size significantly and should be cached aggressively.

### 2.1 List Campaigns (IDs and Names)

**Endpoint:** `GET /data/campaign/list/`

**Query params:** `apiKey`, `archived` (optional boolean)

**Behavior (from legacy `getCampaignsIdsAndNames.php`):**
- Return `[{id, name}]` sorted by name
- Respect user access restrictions (campaign-level permissions via `DBTableRightManagement`)
- Use cache: `Cache::quickGet/quickSet` with user context key

**Response:**
```json
[
  { "id": "123", "name": "Campaign A" },
  { "id": "456", "name": "Campaign B" }
]
```

### 2.2 List Funnels (IDs and Names)

**Endpoint:** `GET /data/campaign/funnel/list/`

**Query params:** `apiKey`, `idCampaign` (optional -- filter to one campaign), `archived` (optional), `prefixWithCampaignNames` (optional boolean)

**Behavior (from legacy `getFunnelsIdsAndNames.php`):**
- Return `[{id, name}]` sorted by name
- When `prefixWithCampaignNames=true`, format name as `"Campaign Name > Funnel Name"`
- Filter by campaign if specified

**Response:**
```json
[
  { "id": "789", "name": "Campaign A > Main Funnel" },
  { "id": "012", "name": "Campaign A > Test Funnel" }
]
```

### 2.3 List Pages (IDs and Names)

**Endpoint:** `GET /data/page/list/`

**Query params:** `apiKey`, `pageType` (optional: `lander` or `offer`), `archived` (optional), `categoryId` (optional)

**Behavior (from legacy `getPageIdsAndNames.php`):**
- Return `[{id, name}]` sorted by name
- Deduplicate names by appending `[id]` if collisions exist
- Exclude invisible preview page (id=1)
- Filter by type, archive status, and category

### 2.4 List Traffic Sources (IDs and Names)

**Endpoint:** `GET /data/trafficsource/list/`

**Query params:** `apiKey`, `archived` (optional), `includeOrganic` (optional boolean, default false)

**Behavior (from legacy `getTrafficSourcesIdsAndNames.php`):**
- Return `[{id, name, defaultCostPerEntrance, costType}]` sorted by name
- Exclude organic traffic source unless `includeOrganic=true`
- Include cost data since it's needed for funnel entrance URL generation

### 2.5 List Conditions (IDs and Names)

**Endpoint:** `GET /data/campaign/funnel/condition/list/`

**Query params:** `apiKey`

**Behavior:**
- Return `[{id, name}]` for conditions

### 2.6 List Code Snippets (IDs and Names)

**Endpoint:** `GET /data/campaign/funnel/codesnippet/list/`

**Query params:** `apiKey`, `codeType` (optional: `javascript` or `php`)

**Behavior:**
- Return `[{id, name, codeType}]`

### 2.7 List Page Categories

**Endpoint:** `GET /data/page/category/list/`

**Query params:** `apiKey`, `archived` (optional)

**Response:**
```json
[
  { "id": "", "name": "Uncategorized" },
  { "id": "cat1", "name": "Conversions" },
  { "id": "cat2", "name": "Presells" }
]
```

### 2.8 List Traffic Source Categories

**Endpoint:** `GET /data/trafficsource/category/list/`

**Query params:** `apiKey`, `archived` (optional)

**Response:**
```json
[
  { "id": "", "name": "Uncategorized" },
  { "id": "cat1", "name": "Search" },
  { "id": "cat2", "name": "Pops" }
]
```

---

## 3. Batch Operations

**Priority: MEDIUM** -- improves UX for managing many entities, but single-item operations work as fallback.

### 3.1 Batch Archive Pages

**Endpoint:** `PUT /data/page/archive/`

**Body:**
```json
{
  "ids": ["id1", "id2", "id3"],
  "archive": true
}
```

**Behavior (from legacy `archivePages.php`):**
- Loop through IDs, call `DBTablePages::archivePage($id, $archive)` for each
- `archive: false` un-archives

**Response:**
```json
{ "success": true, "processed": 3, "errors": [] }
```

### 3.2 Batch Delete Pages

**Endpoint:** `DELETE /data/page/deleteBulk/`

**Body:**
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

**Behavior (from legacy `deletePages.php`):**
- Wrap in transaction
- Call `DBTablePages::deletePage($id, false)` for each (false = don't trigger individual events)
- On success: trigger single batch event `EventPagesDeleted`
- On any failure: rollback entire transaction

### 3.3 Batch Archive Traffic Sources

**Endpoint:** `PUT /data/trafficsource/archive/`

**Body:**
```json
{
  "ids": ["id1", "id2", "id3"],
  "archive": true
}
```

### 3.4 Batch Delete Traffic Sources

**Endpoint:** `DELETE /data/trafficsource/deleteBulk/`

**Body:**
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

**Behavior (from legacy `deleteTrafficSources.php`):**
- Call `DBTableTrafficSources::deleteBulk($ids)` which handles transaction internally

---

## 4. Category Management

**Priority: MEDIUM** -- needed for organizing pages and traffic sources.

### 4.1 Page Category CRUD

**Save:** `POST /data/page/category/save/`

**Body:**
```json
{
  "idCategory": "cat1",
  "name": "Conversions"
}
```

- `idCategory` = null or omitted for new categories (auto-generated via `DB::getUID()`)
- Name must be alphanumeric + spaces only
- Returns `{ "idCategory": "new_or_existing_id" }`

**Delete:** `DELETE /data/page/category/delete/`

**Query params:** `apiKey`, `idCategory`

- Soft-deletes (marks `bDeleted=1`, prepends `[DELETED timestamp]` to name)
- Unassigns all pages from this category (sets their `idCategory` to null)

**Assign:** `PUT /data/page/category/assign/`

**Body:**
```json
{
  "pageIds": ["p1", "p2", "p3"],
  "idCategory": "cat1"
}
```

- Set `idCategory` to empty string or null to unassign
- Loops through pages, updates each via `DBTablePages::savePage()`

### 4.2 Traffic Source Category CRUD

**Save:** `POST /data/trafficsource/category/save/`

**Body:**
```json
{
  "idCategory": "cat1",
  "name": "Search"
}
```

**Delete:** `DELETE /data/trafficsource/category/delete/`

**Query params:** `apiKey`, `idCategory`

**Assign:** `PUT /data/trafficsource/category/assign/`

**Body:**
```json
{
  "trafficSourceIds": ["ts1", "ts2"],
  "idCategory": "cat1"
}
```

Same patterns as page categories. Default categories pre-populated: Search, Contextual, Pops, Display, Social, Native, Mixed.

---

## 5. CSV Import/Export

**Priority: MEDIUM** -- CSV import is a convenience feature; CSV export is important for reporting.

### 5.1 CSV Pages Import

**Endpoint:** `POST /data/page/import/csv/`

**Content-Type:** `multipart/form-data` with CSV file upload

**CSV format for landers:**
```csv
Lander Name,URL,Category,Redirect Type
"My Landing Page","https://example.com/lander","Conversions",307
```

**CSV format for offers:**
```csv
Offer Name,URL,Category,Payout,Redirect Type,Offer Source
"My Offer","https://example.com/offer","CPA",2.50,307,"MaxBounty"
```

**Behavior (from legacy `csvPagesImport.php`):**
- File must be `.csv`, max 900KB
- Validate each row: name unique, URL valid, redirect type valid
- Auto-create categories and affiliate networks if referenced but don't exist
- Wrap in transaction (all-or-nothing)

**Response:**
```json
{ "success": true, "imported": 15 }
```

### 5.2 CSV Stats Export

**Endpoint:** `POST /stats/reporting/export/csv/`

**Body:**
```json
{
  "statsParams": {
    "groupBys": [...],
    "filters": [...],
    "dateRange": {...}
  },
  "filename": "export_20260313.csv"
}
```

**Behavior (from legacy `exportCsv.php`):**
- Calls the V2 drilldown API internally with the provided params
- Writes header row (column display names)
- Writes data rows
- Escapes long numeric IDs with leading quote (Excel compatibility)
- Supports paginated export for large datasets
- Stores file in cache folder

**Response:**
```json
{
  "success": true,
  "complete": true,
  "url": "https://your-domain.com/cache/export_20260313.csv"
}
```

**Alternative approach:** The React frontend could handle CSV generation client-side by fetching drilldown data via the existing V2 API and converting to CSV in JavaScript. This would eliminate the need for a server-side export endpoint entirely. Consider this before building a backend endpoint.

---

## 6. Traffic Source Templates

**Priority: MEDIUM** -- important for user onboarding and setup convenience.

### 6.1 List Templates

**Endpoint:** `GET /data/trafficsource/template/list/`

**Query params:** `apiKey`

**Behavior:**
- Scan `/admin/templates/traffic-sources/` directory
- Return list of available template filenames (strip `.txt` extension)

**Response:**
```json
[
  "Facebook Ads", "Google Adwords", "Bing", "Taboola", "Outbrain",
  "ZeroPark", "PropellerAds", "MGID", "PopAds", "PopCash", ...
]
```

There are currently 37 templates on disk.

### 6.2 Get Template

**Endpoint:** `GET /data/trafficsource/template/load/`

**Query params:** `apiKey`, `name` (template name, e.g. "ZeroPark")

**Behavior (from legacy `getTrafficSourceTemplate.php`):**
- Read INI-format file from `/admin/templates/traffic-sources/{name}.txt`
- Parse sections: `[identification]`, `[tracking-fields]`, `[postback]`
- Return structured JSON

**Response:**
```json
{
  "identification": {
    "name": "ZeroPark",
    "typecost": 0,
    "defaultcost": "{visit_cost}",
    "category": "Pops"
  },
  "trackingFields": [
    { "fieldName": "cid", "token": "{cid}" },
    { "fieldName": "source", "token": "{source}" }
  ],
  "postback": {
    "type": "1",
    "code": "http://postback.zeropark.com/..."
  }
}
```

### 6.3 List Offer Source Templates

**Endpoint:** `GET /data/offersource/template/list/`

Same pattern -- scan `/admin/templates/offer-sources/`.

### 6.4 Get Offer Source Template

**Endpoint:** `GET /data/offersource/template/load/`

**Query params:** `apiKey`, `name`

**Response:**
```json
{
  "identification": {
    "name": "CJ (Commission Junction)",
    "subId": "sid",
    "querySeparator": null,
    "postbackUrl": "https://..."
  }
}
```

---

## 7. Drilldown View Management

**Priority: MEDIUM** -- users save custom report configurations.

Currently V2 only has `/ui/drilldowns/load/` which loads saved views. Save and delete are missing.

### 7.1 Save Drilldown View

**Endpoint:** `PUT /ui/drilldowns/view/save/`

**Body:**
```json
{
  "idView": "view1",
  "name": "My Custom Report",
  "groupBys": ["campaign", "funnel", "country"],
  "visibleColumns": ["entrances", "conversions", "revenue", "roi"]
}
```

**Behavior (from legacy `saveStatisticsGroupingView.php`):**
- `idView` = null for new views (auto-generated)
- Validate name not duplicate
- Store via `DBTableStatsGroupingViews::save()`

**Response:**
```json
{ "idView": "new_or_existing_id" }
```

### 7.2 Delete Drilldown View

**Endpoint:** `DELETE /ui/drilldowns/view/delete/`

**Query params:** `apiKey`, `idView`

**Behavior (from legacy `deleteStatisticsGroupingView.php`):**
- Delete via `DBTableStatsGroupingViews::deleteById()`

---

## 8. User Password Management

**Priority: MEDIUM** -- currently V2 user profile save may not cover password changes.

### 8.1 Change Password

**Endpoint:** `PUT /ui/userprofile/changePassword/`

**Body:**
```json
{
  "idUser": "user1",
  "oldPassword": "current_pass",
  "newPassword": "new_pass"
}
```

**Behavior (from legacy `changePassword.php`):**
- If `oldPassword` is null AND the calling user is an admin AND the target user is NOT admin: allow (admin resetting sub-user password)
- If `oldPassword` is null AND the target user IS admin: reject (cannot skip password verification for admin accounts)
- Otherwise: verify `oldPassword` matches before updating

**Response:**
```json
{ "success": true }
```

**Note:** Check if `/ui/userprofile/save/` already handles password changes. If it does, this endpoint is unnecessary. If it only handles profile fields (name, email, timezone), then this dedicated endpoint is needed.

---

## 9. Move Funnel Between Campaigns

**Priority: LOW** -- used occasionally when reorganizing campaigns.

**Endpoint:** `PUT /data/campaign/funnel/move/`

**Body:**
```json
{
  "idFunnel": "funnel1",
  "idCampaign": "target_campaign_id"
}
```

**Behavior (from legacy `moveFunnel.php`):**
- Load funnel, verify it exists
- If already in target campaign, return unchanged
- Update funnel's campaign ID
- Update all stats aggregate tables to reflect new campaign ownership:
  - `DBTableStatsAggregate::updateCampaignIDByFunnelId()`
  - `DBTableStatsAggregateGroupFTS::updateCampaignIDByFunnelId()`

**Response:**
```json
{ "idFunnel": "funnel1", "funnelName": "Funnel Name" }
```

---

## 10. Visitor Tags Management

**Priority: LOW** -- used for advanced visitor segmentation.

### 10.1 Update Tag Name Across Nodes

**Endpoint:** `PUT /data/tag/update/`

**Body:**
```json
{
  "idTag": "tag1",
  "name": "new_tag_name"
}
```

**Behavior (from legacy `updateTagInNodes.php`):**
- Wrap in transaction
- Update tag name in `visit_tags` table
- Find ALL `visitorTag` nodes across all funnels
- Update the tag reference in each node's params array
- Save modified nodes

### 10.2 List Tags

**Endpoint:** `GET /data/tag/list/`

**Query params:** `apiKey`

**Response:**
```json
[
  { "id": "tag1", "name": "buyer" },
  { "id": "tag2", "name": "high-value" }
]
```

### 10.3 Save Tags

**Endpoint:** `POST /data/tag/save/`

**Body:**
```json
{
  "tags": ["buyer", "high-value", "retarget"]
}
```

---

## 11. User Rights / Permissions

**Priority: LOW** -- only needed for multi-user setups.

### 11.1 Copy Rights Between Users

**Endpoint:** `POST /ui/usermanagement/copyRights/`

**Body:**
```json
{
  "sourceUserId": "user1",
  "targetUserId": "user2"
}
```

**Behavior (from legacy `copyRights.php`):**
- Load all rights from source user via `DBTableRightManagement::getAllRightByIdUser()`
- Apply same rights to target user
- Return the rights structure for confirmation

### 11.2 Get User Rights

**Endpoint:** `GET /ui/usermanagement/rights/`

**Query params:** `apiKey`, `idUser`

**Response:**
```json
{
  "accessRights": [
    {
      "idCategory": 1,
      "nameCategory": "Campaigns",
      "rights": 255,
      "rightsDescription": "Read/Write/Delete",
      "restrictTo": "campaign_id_1,campaign_id_2"
    }
  ]
}
```

---

## 12. System Notifications

**Priority: LOW** -- the React UI can implement this differently.

### 12.1 Check Notifications

**Endpoint:** `GET /ui/inbox/notifications/check/`

**Query params:** `apiKey`

**Behavior (from legacy `checkForNewNotifications.php`):**
- Count unread messages via `DBTableMessages::getUnreadCount()`
- If there's a system notification: return its content for popup display and mark as read
- Track last-notified count to only alert on changes

**Response:**
```json
{
  "unreadCount": 3,
  "forcePopup": false,
  "notification": null
}
```

Or when there's a system notification:
```json
{
  "unreadCount": 1,
  "forcePopup": true,
  "notification": {
    "title": "System Update Available",
    "message": "Version 2.5 is ready to install",
    "subMessage": "Click to view details"
  }
}
```

**Note for React UI:** Consider replacing polling (legacy polls every 45 seconds) with WebSocket or Server-Sent Events. Even if the backend initially polls, the React frontend can abstract this.

---

## 13. Miscellaneous Small Endpoints

### 13.1 Monthly Goal

**Priority: LOW**

**Endpoint:** `PUT /ui/dashboard/save/monthlyGoal/`

**Body:**
```json
{
  "goal": 10000.00
}
```

**Behavior (from legacy `setMonthlyGoalAndGetPercentage.php`):**
- Store goal in meta table (`DBTableMeta::KEY_DASHBOARD_MONTLHY_GOAL`)
- Calculate current month revenue via `DBTableStatsAggregate::getRevenueCurrentMonth()`
- Return percentage achieved

**Response:**
```json
{
  "goal": 10000.00,
  "currentRevenue": 4567.89,
  "percentage": 45.68
}
```

### 13.2 Validate Page Exists

**Priority: LOW** -- can be done client-side by checking if `find/byId` returns 404.

**Endpoint:** `GET /data/page/exists/`

**Query params:** `apiKey`, `idPage`

**Response:**
```json
{ "exists": true }
```

### 13.3 Validate External URL

**Priority: LOW** -- useful for UX but can be done client-side.

**Endpoint:** `GET /system/url/validate/`

**Query params:** `apiKey`, `url`

**Behavior (from legacy `doesUrlExist.php`):**
- Makes HTTP HEAD request to URL via `get_headers()`
- Returns whether it responded with non-404

**Response:**
```json
{ "reachable": true }
```

### 13.4 QR Code Generation

**Priority: LOW** -- nice to have.

**Endpoint:** `GET /system/qrcode/generate/`

**Query params:** `apiKey`, `url`, `size` (optional, pixels), `ecc` (optional: L/M/Q/H)

**Response:** PNG image binary with `Content-Type: image/png`

### 13.5 ClickBank API Key

**Priority: LOW** -- very niche integration.

Can likely be handled by the existing `/ui/systemsettings/save/` endpoint by including the key in the settings payload. Verify this covers the `DBTableApplication::N_CLICKBANK_NOTIFICATION_KEY` field; if so, no new endpoint needed.

### 13.6 Code Snippet Templates

**Priority: LOW**

**Endpoint:** `GET /data/campaign/funnel/codesnippet/template/list/`

**Response:**
```json
{
  "php": ["Auto Optim", "Send Mail"],
  "javascript": []
}
```

**Endpoint:** `GET /data/campaign/funnel/codesnippet/template/load/`

**Query params:** `apiKey`, `name`, `language` (`php` or `javascript`)

**Response:**
```json
{
  "template": "<?php\n// Auto-optimization code..."
}
```

### 13.7 Retroactive Traffic Filter Application

**Priority: LOW** -- rare operation, but important when used.

**Endpoint:** `PUT /data/trafficfilter/applyRetroactively/`

**Body:**
```json
{
  "idFilter": "filter1",
  "apply": true
}
```

**Behavior (from legacy `updatePastTrafficStatsWithTrafficFilter.php`):**
- Set execution timeout to 300s (large dataset operation)
- Load the traffic filter
- Execute ClickHouse `ALTER TABLE UPDATE` to set `IsFiltered` flag on matching historical events
- `apply: false` removes the filter from historical data

**Note:** This is a long-running operation. Consider returning immediately with a job ID and providing a status-check endpoint, or at minimum set a long HTTP timeout.

---

## Implementation Order

Recommended order based on priority and dependencies:

### Phase 1: Core (Unblocks React UI development)
1. Lightweight list endpoints (Section 2) -- needed by every form/dropdown
2. Clone endpoints (Section 1) -- core workflow
3. Category management (Section 4) -- needed for page/TS organization

### Phase 2: Reporting & Data Management
4. Drilldown view save/delete (Section 7) -- needed for saved reports
5. CSV export (Section 5.2) -- needed for reporting
6. CSV pages import (Section 5.1) -- convenience but important
7. Monthly goal (Section 13.1) -- dashboard feature

### Phase 3: Batch & Convenience
8. Batch archive/delete (Section 3) -- improves UX for bulk operations
9. Traffic source templates (Section 6) -- onboarding convenience
10. User password management (Section 8) -- admin function
11. Move funnel (Section 9) -- occasional use

### Phase 4: Polish
12. Visitor tags (Section 10) -- advanced feature
13. User rights management (Section 11) -- multi-user setups
14. System notifications (Section 12) -- can start with polling
15. Remaining miscellaneous (Section 13) -- QR codes, URL validation, etc.

---

## General Implementation Pattern

All new endpoints should follow the existing V2 conventions:

```
/admin/api/v2/{layer}/{entity}/{action}/index.php
```

**Authentication:** `Toolbox::checkApiKey()`

**Transactions:** Wrap all write operations in `DB::getDB()->startTransaction()` / `commit()` / `rollback()`

**Error handling:**
```php
try {
    Toolbox::checkApiKey();
    // ... logic ...
    Toolbox::exitWithSuccess($result);
} catch (\Exception $ex) {
    DB::getDB()->rollback();
    Toolbox::exitWithError($ex->getMessage());
}
```

**Response format:** Always use `Toolbox::exitWithSuccess()` / `Toolbox::exitWithError()` for consistent JSON responses.

**Cache invalidation:** Call `Cache::quickFlush()` after any write operation.

**OpenAPI:** Update the relevant `definition.yaml` after adding each endpoint.
