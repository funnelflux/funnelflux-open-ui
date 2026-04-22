# Plan 03: Environment Configuration & Deployment

**Complexity:** Small — 5 files modified, 1 new file  
**Depends on:** Nothing  

## Problem

Hardcoded paths (`/admin/api/v2`, `/v2-ui`, logout URL) and no `.env.example`. The defaults are correct for standard installations, but need to support the parent FunnelFlux app installed in a subfolder.

Note: This app is built and deployed as a subfolder inside an existing FunnelFlux installation. `/v2-ui` basename and `/admin/api/v2` are correct defaults. No CI/CD needed.

## Steps

### 1. Create `.env.example`

**New file: `.env.example`**

```env
# Base path prefix if FunnelFlux is installed in a subfolder (e.g. /myapp)
# Leave empty for root installation
VITE_BASE_PATH_PREFIX=

# API path (default: /admin/api/v2)
VITE_API_PATH=/admin/api/v2

# UI basename (default: /v2-ui)
# If FunnelFlux is in a subfolder, this should be e.g. /myapp/v2-ui
VITE_UI_BASENAME=/v2-ui
```

### 2. Update API client

**File: `src/api/client.ts:3`**

```ts
const API_PATH = import.meta.env.VITE_API_PATH || '/admin/api/v2'
```

### 3. Eliminate duplicate API_PATH in auth.ts

**File: `src/api/auth.ts`**

Remove the duplicated `const API_PATH = '/admin/api/v2'` and refactor `bootstrapAuth` + `fetchUserProfile` to use `api.get()` from `@/api/client` instead of raw `fetch`. This eliminates:
- Duplicate API path definition
- Duplicate fetch configuration (credentials, headers)
- The auth module bypassing the central API client

```ts
import { api } from '@/api/client'
import type { SessionResponse, UserProfile } from '@/types/api'

export async function bootstrapAuth(): Promise<UserProfile> {
  const session = await api.get<SessionResponse>('/auth/session/')
  if (!session.authenticated) {
    throw new Error('AUTH_REQUIRED')
  }
  return api.get<UserProfile>('/ui/userprofile/loggedin/load/')
}
```

Note: the 401 handling moves to the global interceptor (Plan 6).

### 4. Update App.tsx basename

**File: `src/App.tsx:235`**

```ts
const UI_BASENAME = import.meta.env.VITE_UI_BASENAME || '/v2-ui'
// ...
<BrowserRouter basename={UI_BASENAME}>
```

### 5. Update logout URL

**File: `src/components/layout/Navbar.tsx:255`**

```ts
const basePath = import.meta.env.VITE_BASE_PATH_PREFIX || ''
window.location.href = `${basePath}/admin/login.php?logout=1`
```

### 6. Document in CLAUDE.md

Add `.env.example` reference to the "getting started" context map.

## Verification

- [ ] `npm run build` passes with no env vars set (defaults work)
- [ ] `npm run build` passes with custom env vars (e.g., `VITE_BASE_PATH_PREFIX=/myapp`)
- [ ] API calls hit correct path
- [ ] Logout URL resolves correctly with and without prefix
- [ ] Auth bootstrap uses the central API client (no raw fetch)
