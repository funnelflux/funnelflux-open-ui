type ProtectedStateReset = () => void

const resets = new Set<ProtectedStateReset>()

/** Register API-derived client state that must be cleared on license lock or user swap. */
export function registerProtectedStateReset(reset: ProtectedStateReset): () => void {
  resets.add(reset)
  return () => resets.delete(reset)
}

export function resetProtectedClientState(): void {
  for (const reset of resets) reset()
}
