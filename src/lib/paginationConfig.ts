const STORAGE_KEY = 'ff-server-pagination'

export type PaginatableEntity = 'traffic-sources' | 'offer-sources' | 'landers' | 'offers' | 'campaigns'

export function isServerPaginated(entityType: PaginatableEntity): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return false
    const config: Record<string, boolean> = JSON.parse(stored)
    return config[entityType] === true
  } catch {
    return false
  }
}

export function setServerPaginated(entityType: PaginatableEntity, enabled: boolean): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const config: Record<string, boolean> = stored ? JSON.parse(stored) : {}
    config[entityType] = enabled
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore storage errors
  }
}

export function getServerPaginationConfig(): Record<PaginatableEntity, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const config = stored ? JSON.parse(stored) : {}
    return {
      'traffic-sources': config['traffic-sources'] === true,
      'offer-sources': config['offer-sources'] === true,
      'landers': config['landers'] === true,
      'offers': config['offers'] === true,
      'campaigns': config['campaigns'] === true,
    }
  } catch {
    return { 'traffic-sources': false, 'offer-sources': false, 'landers': false, 'offers': false, 'campaigns': false }
  }
}
