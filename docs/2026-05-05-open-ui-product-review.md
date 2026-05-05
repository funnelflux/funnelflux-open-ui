# FunnelFlux Open UI Product Review

## Overall

The UI is generally in a good visual state. Dark/light mode works, the settings icon works, and the overall layout direction is fine. The main issues are missing functionality, inefficient reload behavior after mutations, table sizing/loading UX, and several screens not matching the expected API/domain behavior from the original FunnelFlux UI.

## Global Issues

### Branding

- Add the FunnelFlux logo next to the FunnelFlux text in the app header/sidebar.

### Table Loading UX

- Several dashboard tables initially render at zero height while loading.
- This causes scrollbars to flicker in and out as skeletons/pagination appear.
- Tables should have a stable minimum height and proper loading skeletons.
- Charts and tables should avoid fully disappearing during data refresh where possible.

### Table Column Widths

- Name columns are often too narrow by default.
- Need consistent auto-expand logic:
  - Fit content where possible.
  - Apply a sensible max width.
  - Avoid compressing names unnecessarily.

### Date Picker Width

- Date picker/select controls are wider than needed.
- Reduce width to fit the displayed date range without large empty whitespace.
- For report pages, time selection is useful.
- For most entity list pages, keep date picker simpler and narrower.

### Mutation Reloads

Many actions appear to reload entire tables or trigger repeated expensive API calls after a single mutation.

Examples:

- Saving a traffic filter appears to reload all traffic filters.
- Deleting offers triggers full reloads and multiple API requests.
- Editing pages appears to trigger multiple ledger/drilldown requests.

This is a major performance issue for users with large accounts, for example 10,000+ offers/pages.

Expected behavior:

- Mutations should update local state inline where possible.
- Avoid full drilldown/report reloads unless strictly required.
- Avoid duplicate requests after edit/archive/delete/save.

### Confirmation Dialogs

Add confirmation dialogs for destructive or high-impact actions:

- Reset Stats / apply retroactively.
- Archive actions where appropriate.
- Delete already has confirmation in some places and seems okay.

## Dashboard

### Current State

Dashboard UI looks okay overall. Cards and tables are generally readable.

### Issues

- Loading tables start at zero height, causing flicker.
- Auto-refresh timing is unknown to the user.
- Skeleton loaders can overtake the UI during refresh.
- Graph disappears and re-renders during load/refresh.
- Table headers show API attribute names instead of friendly labels.

Examples:

- `element:funnel` should be `Funnel`.
- `third_party:traffic_source` should be `Traffic Source`.
- Use friendly names such as Funnel, Traffic Source, Lander, and Offer.

### Table Titles

Current table titles use "Top", for example "Top Funnels", but the tables are paginated and appear to show all data, not a fixed top-N list.

Suggestion:

- Remove "Top" unless the backend/API is truly limiting to top results.

### Dashboard Settings

Add a dashboard settings button near the dashboard header.

Settings should include:

- Auto-refresh interval.
- Rows per table/page.
- Potential future dashboard preferences.

### Pagination

- Pagination consumes too much vertical space on the dashboard.
- Suggested layout:
  - Move page number pagination into the table header row, aligned right with the table title.
  - Move rows-per-page into dashboard/page settings.
- Current issue: switching from 10 to 25 rows can remove pagination entirely, making it hard to return to another page size.

### Chart Colors

Use distinct colors per metric:

- Visits: blue
- Clicks: orange
- Conversions: purple
- Revenue: green
- Cost: pink
- ROI: red/green depending on positive/negative value if possible

## Traffic Filters

### Current State

Page loads and generally looks okay. Edit/delete/save UI looks fine.

### Issues

- Name column is too narrow.
- Need to verify CRUD actually works correctly.
- Save appears to reload the full traffic filters list, which is inefficient.
- Reset Stats currently calls the apply retroactively endpoint without confirmation.
- Missing original traffic filter behavior/settings may need restoring.

### Missing or Questionable Functionality

Original UI likely had traffic filter settings for:

- Hide from stats / mark as filtered.
- Bounce completely from stats / do not save incoming tracker data.
- Bounce to a specific page.

Need to confirm against original UI/API and restore if missing.

## Visitor Page

### Current State

Page does not appear functional. No table loads.

### Issues

- No data/table rendering.
- Needs to be checked against API and Swagger spec.
- Saving malformed data would be a serious issue.

## Global Conditions

### Current State

Edit and delete appear to work.

### Issues

- Name column too narrow.
- Current columns do not make sense:
  - Scope
  - Rules
  - Blocks

Suggested columns:

- Name
- ID

Further UI improvement can happen over time, but first priority is API correctness and valid data shape.

## Campaigns

### Current State

Campaign page currently fails to load data.

Observed issue:

- "Campaign data failed to load"
- Table does not render, even after changing to Last 30 Days.

### Needs Investigation

- Check API requests and responses.
- Confirm whether frontend parsing is broken or backend response is malformed.
- Review v2 API response shape.
- Current API response appears to include excessive unused data.

### API Concern

The v2 API may be returning too much junk/unused data. This is especially painful for large accounts.

Need to explore:

- Adding metric/column restriction support.
- Returning only requested fields/metrics.
- Avoiding changes that break original UI compatibility.
- There may be v1-to-v2 adapter behavior in old app that needs review before backend changes.

## Traffic Sources

### Current State

Overall display looks good. Multi-select bulk action header works well. Archive/delete appear to work.

### Issues

- Category filtering may not be working correctly.
- Everything appears uncategorized, which may be incorrect.
- Need to verify category data is returned and rendered properly.

### Add Traffic Source Modal

Modal is functional but needs presentation cleanup.

Suggested changes:

- Remove redundant subtitle text like "Create a new traffic source" under "Add Traffic Source".
- Move "Copy from template" out of the primary form body.
- Put template selector/action in the modal header area, for example "Use template".
- Reduce excessive internal padding so the form uses modal space better.
- Keep Add Fields and Postback Type behavior; these seem okay.

### Status Filters

Active / Archived / All filtering appears to correctly change API query params, so the earlier concern about client-only filtering is retracted.

### Bulk Actions

- Floating bulk action header is good UX.
- Archive appears to work.
- Delete works one by one.
- Note: there is a bulk archive endpoint, but apparently no bulk delete endpoint, which is inconsistent.

## Offer Sources

### Current State

Looks mostly similar to Traffic Sources and shares the same modal/layout feedback.

### Issues

- Offer source templates may be missing.
- Modal formatting needs the same cleanup as Traffic Sources.
- Postback URL field at bottom lacks internal padding and touches the bottom/button area.
- Query separator field does not make sense; likely should be removed.
  - There is no meaningful separator other than `&`.

### Form ID Display

ID does not need to be in the main form fields.

Suggestion:

- Move ID to header, footer, or below save actions as read-only metadata.

## Offers

### Current State

Offers load slowly for users with many offers. Category grouping exists. Filtering and sorting appear mostly functional.

### Issues

- Category header color looks worse than previous gray styling.
- Name column needs better responsive width behavior.
- Date picker should be narrowed.
- Archive works but should have confirmation.
- Delete has confirmation and works, but is very slow.
- Delete causes full table reload and repeated API requests.
- Multiple GET/status/drilldown calls happen after mutations.

### Performance Priority

Avoid full reloads and duplicate drilldown requests after:

- Edit
- Archive
- Delete
- Page changes
- Status changes

For large accounts, these requests are expensive and make the UI feel slow.

### API/Backend Suggestion

Add backend support to restrict returned metrics/columns by requested type.

Goal:

- Only return data the UI actually asked for.
- Improve performance for large tables.
- Avoid bloated API responses.

Need to evaluate compatibility with original UI before changing API shape.

## Landers

Landers should receive the same treatment as Offers.

Apply the same feedback for:

- Loading performance.
- Category grouping.
- Name column width.
- Date picker width.
- Archive/delete confirmation.
- Avoiding full table reloads.
- Avoiding duplicate drilldown/report requests.
- API response optimization.

## Conversion Updates

### Current State

Page is functional-looking but needs formatting and feature parity with original UI.

### Issues

- Missing help text from original app.
- Form is too plain and needs better layout.
- Reset Stats form does not match original functionality.

### Reset Stats Issues

Current fields:

- Campaign optional.
- Traffic source optional, but does not load traffic sources.
- No funnel selector, but funnel is not optional.
- Date From / Date To need date-time selection.

Missing original capabilities may include:

- Restrict to visitor IP.
- Other reset stats filters/options.

Need to realign form with original UI and API behavior.

## Cost Updates

### Current State

Needs UI and functionality improvements.

### Issues

- Traffic source selector does not load traffic sources.
- Funnel optional is correct.
- Date From / Date To need date-time selection.
- Time zone exists and is good.
- Cost field should support:
  - Total cost
  - Cost per entrance

### Layout

Current one-column form is not polished. Needs better styling and grouping.

## Links / System Links

### Current State

Basic flow works, but several outputs and selectors are incorrect or poorly presented.

### Issues

- Node list does not appear to load.
- After selecting campaign and funnel, node only shows "Default funnel entry".
- Needs to fetch and display actual funnel nodes.
- Domain selector shows literal "Default domain", which is wrong.
  - It should resolve and select the actual default domain, for example `clc.track.com`.
- Remove text: "Outputs update automatically when the cascade changes."
  - It is unnecessary and confusing.

### Output Sections

Current outputs:

- Entrance link
- Universal JS
- Action click URLs
- Conversion postback URLs

Problems:

- Universal JS should be a proper code snippet box, not a single-line input.
- Universal JS should wrap and be styled like code.
- Action click URLs should show URLs for the selected domain.
- Conversion postback URLs do not belong here.
  - An entrance link does not know which offers will be used and convert later.
  - Remove conversion postback URLs from this screen.

Suggested layout:

- Universal JS and Action click URLs in a two-column layout.
- Use better code/output styling.

## Inbox

Inbox currently does not load anything. This appears missing or non-functional.

## API / Swagger Compliance

Several areas need explicit verification against API/Swagger spec:

- Traffic Filters CRUD
- Global Conditions save shape
- Visitor page
- Reset Stats
- Cost Updates
- Links node/domain behavior
- Entity list status/category filtering
- Mutation response handling

Priority is to ensure the UI does not save malformed data and does not perform unnecessary expensive reloads.