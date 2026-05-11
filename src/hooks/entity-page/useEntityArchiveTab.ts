import { useMemo, useState } from 'react'
import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'

interface UseEntityArchiveTabArgs {
  archiveListFilter?: 'trafficsource' | 'status'
  staticListParams?: Record<string, string>
}

export function useEntityArchiveTab({
  archiveListFilter,
  staticListParams,
}: UseEntityArchiveTabArgs) {
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')

  const listParamsForQuery = useMemo((): Record<string, string> | undefined => {
    const base = staticListParams ? { ...staticListParams } : {}
    if (!archiveListFilter) {
      return Object.keys(base).length > 0 ? base : undefined
    }
    if (archiveListFilter === 'trafficsource') {
      if (archiveStatus === 'all') {
        return Object.keys(base).length > 0 ? base : undefined
      }
      return { ...base, archived: archiveStatus === 'archived' ? 'true' : 'false' }
    }
    return { ...base, status: archiveStatus }
  }, [archiveListFilter, archiveStatus, staticListParams])

  return {
    archiveStatus,
    setArchiveStatus,
    listParamsForQuery,
    skipArchiveFilter: Boolean(archiveListFilter),
  }
}
