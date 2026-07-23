---
name: openapi-type-generation
description: Regenerate Open UI TypeScript types after changing a committed `api-specs/` contract file.
---

# OpenAPI type generation

`api-specs/*.yaml` are the generator inputs. After changing one:

```bash
pnpm run generate-types
pnpm run check-generated-types:committed
```

Review the generated output in `src/types/generated/`, then update wrapper types
in `src/types/` and any affected schemas or tests. Generated files are outputs:
never hand-edit them.

Use `pnpm` only. The generator is `scripts/generate-types.mjs`.
