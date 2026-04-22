# Plan 06: Error Handling & Resilience

**Complexity:** Medium — ~5 new/modified files  
**Depends on:** Plan 3 (env config for login URL), Plan 4 (React Query migration removes silent error swallowing)  

## Problem

- Zero error boundaries — any JS error crashes the entire app (white screen)
- No global 401 interceptor — session expiry mid-use shows toast errors instead of redirecting to login
- Core loaders silently swallow errors (`catch {}` with no surfacing)

## 6A. Error Boundaries

### Steps

1. **Create `src/components/shared/ErrorBoundary.tsx`:**

   ```tsx
   import { Component, type ErrorInfo, type ReactNode } from 'react'

   interface Props {
     children: ReactNode
     fallback?: ReactNode
     onError?: (error: Error, info: ErrorInfo) => void
   }

   interface State { hasError: boolean; error: Error | null }

   export class ErrorBoundary extends Component<Props, State> {
     state: State = { hasError: false, error: null }

     static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error }
     }

     componentDidCatch(error: Error, info: ErrorInfo) {
       console.error('ErrorBoundary caught:', error, info.componentStack)
       this.props.onError?.(error, info)
     }

     render() {
       if (this.state.hasError) {
         return this.props.fallback ?? (
           <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
             <h2 className="text-lg font-bold text-destructive mb-2">Something went wrong</h2>
             <p className="text-sm text-muted-foreground mb-4">{this.state.error?.message}</p>
             <button
               onClick={() => this.setState({ hasError: false, error: null })}
               className="text-sm text-primary underline"
             >
               Try again
             </button>
           </div>
         )
       }
       return this.props.children
     }
   }
   ```

2. **Add boundaries in `App.tsx`:**
   - **App-level**: Wrap `<AuthGate>` — catches catastrophic errors, shows full-page fallback
   - **Route-level**: Inside `AppLayout`, wrap the `<Outlet />` — catches page errors without losing the nav shell
   - **FunnelEditorPage**: Extra boundary around the xyflow canvas (most likely to throw)

3. **Export from ui-kit** barrel so pages can use it.

## 6B. Global 401 Interceptor

### Steps

1. **Add 401 detection in `ApiClient.handleResponse`** at `src/api/client.ts`:

   ```ts
   private async handleResponse<T>(res: Response, endpoint?: string): Promise<T> {
     if (res.status === 401) {
       const basePath = import.meta.env.VITE_BASE_PATH_PREFIX || ''
       window.location.href = `${basePath}/admin/login.php`
       throw new Error('Session expired')
     }
     // ... existing error handling
   }
   ```

2. **Configure React Query to not retry on 401:**

   ```ts
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 30_000,
         retry: (failureCount, error) => {
           if (error && typeof error === 'object' && 'code' in error && error.code === 401) return false
           return failureCount < 1
         },
       },
     },
   })
   ```

## 6C. Stop Swallowing Errors

After Plan 4, the main silent `catch {}` blocks in `entityGrid.ts` are gone. For any remaining manual fetches:

1. **Audit:** `grep -rn "catch\s*{" src/` — find all empty catch blocks.
2. **Replace** with `catch (e) { console.error(e) }` at minimum.
3. **Surface in UI** where appropriate — show error state, not empty data.

## Verification

- [ ] Deliberately throw an error in a page component — shows boundary fallback, nav still visible
- [ ] Throw in FunnelEditorPage canvas code — shows boundary, rest of app works
- [ ] Simulate 401 response (e.g., clear cookies) — redirects to login page
- [ ] Simulate API error (e.g., 500) — shows error message, not empty data
- [ ] `grep -rn "catch\s*{}" src/` returns no results
