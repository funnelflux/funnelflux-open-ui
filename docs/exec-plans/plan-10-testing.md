# Plan 10: Testing Infrastructure

**Complexity:** Medium — new framework + initial test suite  
**Depends on:** All other plans (test the final refactored code, not pre-refactor)  

## Problem

Zero test coverage. No test framework configured. No test script in `package.json`. Contributors cannot verify their changes.

## 10A. Set Up Vitest

### Steps

1. **Install:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
   ```

2. **Create `vitest.config.ts`:**
   ```ts
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'
   import { resolve } from 'path'

   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: { '@': resolve(__dirname, 'src') },
     },
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./src/test/setup.ts'],
       include: ['src/**/*.test.{ts,tsx}'],
     },
   })
   ```

3. **Create `src/test/setup.ts`:**
   ```ts
   import '@testing-library/jest-dom/vitest'
   ```

4. **Create `src/test/utils.tsx`** — shared render helper with providers:
   ```tsx
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
   import { render, type RenderOptions } from '@testing-library/react'
   import { BrowserRouter } from 'react-router-dom'
   import { ConfigProvider } from 'antd'

   export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
     const queryClient = new QueryClient({
       defaultOptions: { queries: { retry: false, gcTime: 0 } },
     })
     return render(
       <QueryClientProvider client={queryClient}>
         <ConfigProvider>
           <BrowserRouter>{ui}</BrowserRouter>
         </ConfigProvider>
       </QueryClientProvider>,
       options,
     )
   }
   ```

5. **Add to `package.json`:**
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest",
     "test:coverage": "vitest run --coverage"
   }
   ```

## 10B. Unit Tests — Pure Functions First

These require zero mocking and provide the highest confidence-to-effort ratio.

**Test files live next to source:** `src/lib/utils.test.ts` for `src/lib/utils.ts`.

| Source File | Functions to Test |
|-------------|-------------------|
| `src/lib/entityGridUtils.ts` (after Plan 4) | `buildMergedRows`, `buildTotalsRow`, `pagesToListEntities` |
| `src/lib/reportRowCells.ts` | `cellRaw`, `cellFmt`, `buildColumnsFromReport` |
| `src/lib/utils.ts` | `getErrorMessage`, other utilities |
| `src/lib/date-presets.ts` | Date preset calculations |
| `src/lib/urlTokens.ts` | URL token parsing/formatting |
| `src/lib/id-generator.ts` | ID generation |
| `src/lib/funnelCoords.ts` | Coordinate calculations |
| `src/lib/funnelEdgeGeometry.ts` | Edge geometry calculations |
| `src/lib/drilldownTableSort.ts` | Sort comparator logic |
| `src/lib/sanitize.ts` (after Plan 1) | HTML sanitization, XSS prevention |
| `src/lib/paginationConfig.ts` (after Plan 8) | localStorage read/write, mode detection |
| `src/lib/bulkActions.ts` (after Plan 7) | Concurrent batching, partial failure handling |
| `src/lib/funnelConversions.ts` (after Plan 9) | API ↔ Flow conversion |

### Example Test

```ts
// src/lib/reportRowCells.test.ts
import { describe, it, expect } from 'vitest'
import { cellRaw, cellFmt } from './reportRowCells'

describe('cellRaw', () => {
  it('returns numeric raw value', () => {
    expect(cellRaw({ raw: 42, formatted: '42' })).toBe(42)
  })

  it('returns 0 for undefined cell', () => {
    expect(cellRaw(undefined)).toBe(0)
  })
})
```

## 10C. Hook Tests

After Plans 4 and 7, test the React Query hooks using `renderHook` + MSW (Mock Service Worker).

| Hook | What to Test |
|------|-------------|
| `useEntityGrid` | Returns merged rows, handles loading/error, refetches on param change |
| `createEntityHooks` | CRUD operations trigger correct endpoints, cache invalidation works |
| `useDashboardReport` | Polling interval works, stale data handling |
| `useAuth` | Auth flow, 401 redirect |

### MSW Setup

```ts
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/admin/api/v2/data/page/list/', () => {
    return HttpResponse.json([
      { idPage: '1', pageName: 'Test Lander', pageType: 'lander' },
    ])
  }),
  // ... other entity endpoints
]
```

```ts
// src/test/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

```ts
// src/test/setup.ts (updated)
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## 10D. Component Integration Tests

Test the shared entity page pattern (after Plan 7) once — it covers all entity pages.

| Test | What to Verify |
|------|----------------|
| Entity page renders | Loading spinner → data appears in table |
| Search filters rows | Type in search → visible rows filtered |
| CRUD flow | Create → row appears, Edit → form opens with data, Delete → confirm + removes |
| Bulk actions | Select rows → archive → deselects and refreshes |
| Error boundary | Simulate throw → fallback shown |
| Pagination toggle | Switch to server-side → API called with paging params |

## 10E. Update CLAUDE.md Verification Checklist

Add:
```
- [ ] `npm test` passes
- [ ] New pure functions have unit tests
- [ ] New hooks have hook tests
```

## Verification

- [ ] `npm test` runs and all tests pass
- [ ] `npm run test:coverage` shows > 80% coverage for `src/lib/` functions
- [ ] Tests complete in < 15 seconds
- [ ] MSW mocks work for hook tests
- [ ] Component tests render with all providers
