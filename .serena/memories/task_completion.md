# Task Completion Checklist

Before work:
- Read root `CLAUDE.md` and relevant docs/context from its context map.
- For entity pages, inspect `src/pages/campaigns/CampaignsPage.tsx` and shared page/table hooks.
- For API integration, inspect `src/api/client.ts`, `src/api/queryKeys.ts`, and `docs/api-specs/`.

Before final response:
- Run `rtk git status` and inspect relevant diffs.
- Summarize changed files and verification.
- State if backend-dependent checks could not run.

Standard validation:
- `pnpm run build`
- `pnpm run lint`
- `pnpm test`
- For generated API changes: `pnpm run generate-types` and inspect resulting diffs.

UI verification:
- For functional UI changes, run backend on port 8080 and Vite dev server on 5173.
- Use Playwright/browser checks where visual or workflow behavior matters.

Commit/push:
- Only with explicit user request.
- Ensure no TODO placeholders and scope stays within request.