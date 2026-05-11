import { useMemo, useState } from 'react'
import type { EntityGridRow } from '@/lib/entityGridUtils'

interface UseEntitySearchArgs {
  rows: EntityGridRow[]
  selectedCategoryId: string
  archiveStatus: 'active' | 'archived' | 'all'
  skipArchiveFilter: boolean
}

export function useEntitySearch({
  rows,
  selectedCategoryId,
  archiveStatus,
  skipArchiveFilter,
}: UseEntitySearchArgs) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const searchText = search.toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || row.categoryId === selectedCategoryId
      const matchesArchive =
        skipArchiveFilter ||
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? row.isArchived === true : row.isArchived !== true)
      return matchesSearch && matchesCategory && matchesArchive
    })
  }, [archiveStatus, rows, search, selectedCategoryId, skipArchiveFilter])

  return {
    search,
    setSearch,
    filtered,
  }
}
