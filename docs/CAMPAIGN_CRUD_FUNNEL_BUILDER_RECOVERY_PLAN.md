# Campaign CRUD and Funnel Builder Recovery Plan

Context: this plan was written after the open UI submodule was wiped and recloned. Keep it as the continuation point for the Campaigns CRUD / Funnel Builder pass after lost UI work is recovered.

## Immediate Flow Fixes

1. Add Campaign
   - Current backend rejects create without `idCampaign`: `Invalid Value for Parameter ID Campaign must be numeric and greater than zero`.
   - Do not paper over this permanently in frontend. Track as V2 API fix: create should accept missing/empty `idCampaign` and generate it server-side.
   - Frontend may improve the visible error message while backend is pending.

2. Add Funnel modal
   - Replace single `Open editor` action with separate buttons:
     - `Save`: create funnel, close modal, refresh campaigns/funnels list.
     - `Save and edit`: create funnel, then route to `/campaigns/:campaignId/funnels/:idFunnel`.
   - Do not route to `/funnels/new` as if it already exists.

3. New funnel builder route
   - Stop detail queries that treat `new` as a real funnel id.
   - If a draft route remains, gate `find/byId` and related dependent queries while `funnelId === 'new'`.
   - Prefer persisted-before-editor flow for normal Add Funnel.

4. Builder initial viewport
   - New/default traffic node should open zoomed out several steps.
   - Traffic node should be horizontally centered and around one quarter from the top.

## Funnel Builder Picker Fixes

5. Lander and offer picker dialogs
   - Widen the modal.
   - Remove simultaneous vertical and horizontal scroll.
   - Truncate long names cleanly.
   - Add performant filtering:
     - Short term: virtualized list plus debounced local search.
     - Longer term: V2 API server-side search for very large page lists.

## Condition Editor Fixes

6. Condition rule/block deletion
   - Allow removing the last rule and the last block during editing.
   - Saving with zero valid rules/blocks should be blocked by validation.

7. Condition validation display
   - When save fails validation, show visible field/block errors.
   - Avoid flicker-only failure with no red marking or explanation.

## Node Rendering and Modals

8. Node label duplication
   - Remove redundant subtitle text where type/title/name repeat.
   - First pass: condition, JavaScript, PHP if affected, visitor tag.

9. Code node edit modals
   - Fix JavaScript modal overflow where buttons overlap textarea.
   - Normalize gaps, label styling, and field alignment.
   - Remove odd divider above footer if it does not match modal kit.

10. Visitor tag modal
   - Remove horizontal scrollbar under create-new-tag area after tag creation.

## Validation

11. Run focused validation after recovery:
   - `pnpm exec tsc -b --pretty false`
   - `pnpm lint`
   - `pnpm test -- --run`
   - `pnpm build`

