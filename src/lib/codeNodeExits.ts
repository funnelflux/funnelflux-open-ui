/** Max parallel exits from Javascript / PHP code nodes (matches legacy funnel builder). */
export const CODE_NODE_MAX_ON_DONE_EXITS = 64

/** Single egress handle on JS/PHP nodes (`edge.data.onDoneNumber` disambiguates up to {@link CODE_NODE_MAX_ON_DONE_EXITS} links). */
export const CODE_NODE_UNIFIED_SOURCE_HANDLE = 'code-out'

/** Single ingress handle on JS/PHP nodes (replaces stacked `t-*` from BaseNode). */
export const CODE_NODE_UNIFIED_TARGET_HANDLE = 'code-in'

/** React Flow handle id for slot `n` (1-based). Used in persisted graphs / migration only. */
export function codeExitHandleId(n: number): string {
  return `onDone-${n}`
}

/** Parse slot index from {@link codeExitHandleId}; returns null when not an exit handle. */
export function parseCodeExitHandleId(handle: string | null | undefined): number | null {
  if (!handle || !handle.startsWith('onDone-')) return null
  const m = /^onDone-(\d+)$/.exec(handle)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isInteger(n) || n < 1 || n > CODE_NODE_MAX_ON_DONE_EXITS) return null
  return n
}

export function isCodeNodeUnifiedSourceHandle(handle: string | null | undefined): boolean {
  return handle === CODE_NODE_UNIFIED_SOURCE_HANDLE
}
