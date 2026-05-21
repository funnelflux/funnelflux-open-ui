const COPY_SUFFIX = ' (copy)'

/** Name for a cloned entity form draft (`(copy)` suffix, respects max length). */
export function defaultClonedEntityName(
  sourceName: string,
  emptyFallback: string,
  maxLen = 255,
): string {
  const trimmed = sourceName.trim()
  if (!trimmed) return emptyFallback
  if (trimmed.length + COPY_SUFFIX.length <= maxLen) return `${trimmed}${COPY_SUFFIX}`
  return `${trimmed.slice(0, maxLen - COPY_SUFFIX.length)}${COPY_SUFFIX}`
}
