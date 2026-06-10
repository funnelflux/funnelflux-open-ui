import { z } from 'zod/v4'

export const TAG_NAME_MAX_LENGTH = 255

/** Comma-separated input → non-empty trimmed names (matches PHP `TagCreateRequest.tags`). */
export function parseTagNamesInput(input: string): string[] {
  return input
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
}

export function dedupeTagNames(names: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const name of names) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(name)
  }
  return deduped
}

export function validateTagName(name: string): string | null {
  const normalized = name.trim()
  if (!normalized) return 'Tag name cannot be empty'
  if (normalized.length > TAG_NAME_MAX_LENGTH) {
    return `Tag name cannot exceed ${TAG_NAME_MAX_LENGTH} characters`
  }
  return null
}

function tagModalCreateValueRefine(val: string, ctx: z.core.$RefinementCtx) {
  const parts = dedupeTagNames(parseTagNamesInput(val))
  if (parts.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter at least one tag name',
    })
    return
  }
  for (const n of parts) {
    const err = validateTagName(n)
    if (err) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: err })
      return
    }
  }
}

function tagModalEditValueRefine(val: string, ctx: z.core.$RefinementCtx) {
  const err = validateTagName(val)
  if (err) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: err })
  }
}

export const tagModalFormSchemaCreate = z.object({
  value: z.string().superRefine(tagModalCreateValueRefine),
})

export const tagModalFormSchemaEdit = z.object({
  value: z.string().superRefine(tagModalEditValueRefine),
})

export type TagModalFormValues = z.infer<typeof tagModalFormSchemaCreate>
