import { useEntityPage } from '@/hooks/useEntityPage'
import {
  useAssetTableEngine,
  type AssetTableEnginePageData,
  type UseAssetTableEngineOptions,
} from '@/lib/entity-table/engine/useServerPagedData'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'

export type EntityTableMode = 'flat-client-paged' | 'server-paged'
type ServerPagedEntityTableMode = 'server-paged'
type FlatClientPagedEntityTableMode = 'flat-client-paged'
type FlatEntityConfig = Parameters<typeof useEntityPage>[0] & { mode: FlatClientPagedEntityTableMode }
type ServerEntityConfig<TData extends EntityGridRow> = UseAssetTableEngineOptions<TData> & {
  mode: ServerPagedEntityTableMode
}

function stripEntityTableMode<T extends { mode: EntityTableMode }>(config: T): Omit<T, 'mode'> {
  const next = { ...config }
  delete (next as { mode?: EntityTableMode }).mode
  return next as Omit<T, 'mode'>
}

async function stubServerLoadPage(): Promise<AssetTableEnginePageData<EntityGridRow>> {
  return { rows: [], columns: [], totalsCells: null, totalRows: 0 }
}

/** Stable inactive-branch options so React Query stays disabled without touching real endpoints. */
const STUB_FLAT_OPTIONS: Parameters<typeof useEntityPage>[0] = {
  queryKeyPrefix: ['__entity_table_stub_flat__'],
  listEndpoint: '',
  groupBy: '__stub__',
}

const STUB_SERVER_OPTIONS: UseAssetTableEngineOptions<EntityGridRow> = {
  tableKey: '__entity_table_stub_server__',
  queryKeyPrefix: ['__entity_table_stub_server__'],
  queryScopeKey: '__stub__',
  dateFrom: new Date(0),
  dateTo: new Date(0),
  timezone: 'UTC',
  pageIndex: 0,
  pageSize: 1,
  search: '',
  loadPageData: stubServerLoadPage,
}

/**
 * Facade so pages converge on one hook name.
 * Both underlying hooks run every render; the inactive branch passes `enabled: false` so hooks stay ordered.
 */
export function useEntityTable<TData extends EntityGridRow>(config: ServerEntityConfig<TData>): ReturnType<typeof useAssetTableEngine<TData>>
export function useEntityTable(config: FlatEntityConfig): ReturnType<typeof useEntityPage>
export function useEntityTable<TData extends EntityGridRow>(
  config: ServerEntityConfig<TData> | FlatEntityConfig,
) {
  const isFlat = config.mode === 'flat-client-paged'

  const flatPageOptions: Parameters<typeof useEntityPage>[0] = isFlat
    ? { ...stripEntityTableMode(config as FlatEntityConfig), enabled: true }
    : { ...STUB_FLAT_OPTIONS, enabled: false }

  const serverEngineOptions = (
    !isFlat
      ? { ...stripEntityTableMode(config as ServerEntityConfig<TData>), enabled: true }
      : { ...STUB_SERVER_OPTIONS, enabled: false }
  ) as UseAssetTableEngineOptions<TData>

  const flatResult = useEntityPage(flatPageOptions)
  const serverResult = useAssetTableEngine(serverEngineOptions)

  return isFlat ? flatResult : serverResult
}
