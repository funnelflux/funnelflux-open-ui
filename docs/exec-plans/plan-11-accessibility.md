# Plan 11: Accessibility (A11Y)

**Complexity:** Medium — ~5 files modified  
**Depends on:** Nothing  

## Problem

Multiple accessibility issues found across the UI. For an open-source project, basic WCAG 2.1 AA compliance is expected.

## 11A. DataTable Missing ARIA Roles

**Problem:** `src/components/ui-kit/data-table/DataTable.tsx` uses `<div>` elements for all table markup (header, rows, cells) with no ARIA table roles. Screen readers cannot interpret it as a data table.

### Steps

1. **Add ARIA roles to the table container and structure:**
   - Outer container: `role="table"`
   - Header row: `role="row"` with `role="columnheader"` on each header cell
   - Body rows: `role="row"` with `role="cell"` on each data cell

2. **Or switch to semantic HTML** — use `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` with Tailwind styling. Virtualization still works with semantic table elements.

## 11B. DataTable Sort Headers Not Keyboard-Accessible

**Problem:** `DataTable.tsx:419,421` — sort headers are clickable `<div>` elements with no keyboard semantics.

### Steps

1. **Make sortable headers into `<button>` elements** (or add `role="button"`, `tabIndex={0}`, and `onKeyDown` for Enter/Space).
2. **Add `aria-sort` attribute** to sorted columns: `aria-sort="ascending"` or `aria-sort="descending"`.

## 11C. Icon-Only Buttons Missing Accessible Labels

**Problem:** Multiple locations have icon-only buttons with `title` tooltips but no `aria-label`:
- `src/components/ui-kit/data-table/columnDefs.tsx:492,497` — action buttons (edit, clone, archive, delete)
- `src/pages/links/SystemLinksPage.tsx:22,32` — copy button

### Steps

1. **Add `aria-label` to all icon-only buttons:**
   ```tsx
   <Button icon={<Edit />} aria-label="Edit" title="Edit" />
   <Button icon={<Copy />} aria-label="Copy to clipboard" title="Copy" />
   ```

2. **Audit all icon-only buttons** across the codebase:
   ```bash
   grep -rn "icon={<" src/ | grep -v "aria-label"
   ```

## 11D. Selection Checkboxes Missing Labels

**Problem:** `src/components/ui-kit/data-table/columnDefs.tsx:597,608` — header and row selection checkboxes have no accessible labels.

### Steps

1. **Add `aria-label` to the header checkbox:**
   ```tsx
   <input type="checkbox" aria-label="Select all rows" ... />
   ```

2. **Add `aria-label` to row checkboxes:**
   ```tsx
   <input type="checkbox" aria-label={`Select row ${row.original.name}`} ... />
   ```

## 11E. ESLint A11Y Plugin

### Steps

1. **Install:**
   ```bash
   npm install -D eslint-plugin-jsx-a11y
   ```

2. **Add to `eslint.config.js`:**
   ```ts
   import jsxA11y from 'eslint-plugin-jsx-a11y'
   // Add jsxA11y.flatConfigs.recommended to the config array
   ```

3. **Fix any new violations** surfaced by the plugin.

4. This prevents future a11y regressions from being introduced.

## Verification

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (with jsx-a11y rules)
- [ ] Tab through DataTable — sort headers and action buttons are keyboard-reachable
- [ ] Screen reader announces table structure, sort state, checkbox labels
- [ ] No `aria-label` missing on icon-only interactive elements
