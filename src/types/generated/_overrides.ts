/**
 * Manual overrides and augmentations for generated API types (`src/types/generated/*.ts`).
 *
 * **Do not edit** `data.ts`, `stats.ts`, `ui.ts`, `system.ts`, or `index.ts` by hand.
 * Prefer fixing `docs/api-specs/*.yaml` and running `pnpm run generate-types`.
 *
 * Use this file when TypeScript-only fixes are needed (e.g. branded IDs, stricter
 * unions) without changing the OpenAPI snapshot:
 *
 * @example
 * ```ts
 * import type { SomeDto } from '@/types/generated/data'
 * export type SomeDtoStrict = SomeDto & { verified: true }
 * ```
 */

export {}
