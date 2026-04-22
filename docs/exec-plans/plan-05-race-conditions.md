# Plan 05: Race Condition Fixes

**Complexity:** Small-Medium — ~3 files  
**Depends on:** Plan 4 (eliminates most race conditions for free)  

## Problem

Entity grid store, dashboard, and system links have no request versioning or cancellation. Slower old responses can overwrite newer data when users change filters/dates/selections quickly.

## After Plan 4

React Query handles request identity via query keys — when params change, the old query result is ignored and the new one takes over. **Plan 4 eliminates race conditions in entity grids and dashboard for free.**

## Remaining: System Links

**Problem:** `src/pages/links/SystemLinksPage.tsx:69,82,92` fires 3 independent mutations per selection change. Old responses can overwrite current selection results.

### Steps

1. **Read `SystemLinksPage.tsx`** fully to understand the mutation pattern.

2. **Add request versioning** with a ref counter:
   ```ts
   const requestIdRef = useRef(0)

   const handleGenerate = useCallback(async () => {
     const thisRequest = ++requestIdRef.current
     try {
       const result = await generateLinks.mutateAsync(params)
       if (requestIdRef.current !== thisRequest) return // stale, discard
       setResult(result)
     } catch (err) {
       if (requestIdRef.current !== thisRequest) return
       toast.error(getErrorMessage(err))
     }
   }, [params])
   ```

3. **Alternatively**, convert the mutations to queries if the link generation is idempotent (GET-like). React Query would then handle cancellation automatically via query key changes.

4. **If the 3 calls can be combined** into a single request to the API, do that instead — fewer moving parts, no race.

## Verification

- [ ] Rapidly change filters/dates on entity pages — latest data always wins
- [ ] Rapidly change selection on System Links — no stale overwrites
- [ ] No console errors from discarded responses
