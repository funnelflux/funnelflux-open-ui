# Suggested Commands

Package manager:
- Use `pnpm` only. Do not run `npm install` or `yarn`.

Development:
- `pnpm install`
- `pnpm run dev` — Vite dev server on port 5173, proxies `/admin` to backend.
- `pnpm run dev:force` — Vite dev with cache invalidated.
- `pnpm run preview` — preview built `dist/`.

Build/test/lint:
- `pnpm run build` — `tsc -b && vite build`, outputs to `dist/`.
- `pnpm run lint` — ESLint flat config.
- `pnpm test` — Vitest single run.
- `pnpm run test:watch` — Vitest watch.
- `pnpm run generate-types` — generate TypeScript API types from `docs/api-specs/*.yaml`.

Backend dependency:
- Self-hosted backend should run at `http://localhost:8080` for UI functionality.
- UI served under `/v2-ui`; dev proxy handles `/admin/*`.

General:
- `rtk git status`, `rtk git diff`, `rtk rg <pattern>`, `rtk rg --files`.