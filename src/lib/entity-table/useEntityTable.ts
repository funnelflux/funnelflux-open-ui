import { useEntityPage } from '@/hooks/useEntityPage'

export type EntityTableMode = 'flat-client-paged'
type FlatClientPagedEntityTableMode = 'flat-client-paged'
type FlatEntityConfig = Parameters<typeof useEntityPage>[0] & { mode: FlatClientPagedEntityTableMode }

function stripEntityTableMode<T extends { mode: EntityTableMode }>(config: T): Omit<T, 'mode'> {
  const next = { ...config }
  delete (next as { mode?: EntityTableMode }).mode
  return next as Omit<T, 'mode'>
}

/**
 * Facade so pages converge on one hook name for flat client-paged entity tables.
 */
export function useEntityTable(config: FlatEntityConfig) {
  return useEntityPage(stripEntityTableMode(config))
}
