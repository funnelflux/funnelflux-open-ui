# Plan 01: Security — XSS in InboxPage

**Complexity:** Small — 1 new dependency, 2 files changed  
**Depends on:** Nothing  

## Problem

`src/pages/inbox/InboxPage.tsx:140` renders `message.body` via `dangerouslySetInnerHTML` with zero sanitization. If the backend ever relays user-controlled HTML (or is compromised), this is an XSS sink. This is the only `dangerouslySetInnerHTML` usage in the codebase.

## Steps

### 1. Install DOMPurify

```bash
npm install dompurify
npm install -D @types/dompurify
```

### 2. Create sanitize helper

**New file: `src/lib/sanitize.ts`**

```ts
import DOMPurify from 'dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'code', 'pre', 'blockquote', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
}
```

### 3. Update InboxPage

**File: `src/pages/inbox/InboxPage.tsx:138-141`**

Change:
```tsx
dangerouslySetInnerHTML={{ __html: message.body }}
```
To:
```tsx
dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body) }}
```

### 4. Audit

Run `grep -rn "dangerouslySetInnerHTML" src/` — confirm InboxPage is the only usage. If others exist, apply the same `sanitizeHtml` wrapper.

## Verification

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual test: inbox message containing `<img src=x onerror=alert(1)>` — tag stripped
- [ ] Manual test: inbox message with legitimate formatting (`<strong>`, `<a>`) — renders correctly
