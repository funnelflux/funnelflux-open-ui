export type DataTablePageToken = number | 'ellipsis'

export function buildDataTablePageTokens(totalPages: number, currentPage: number): DataTablePageToken[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
  const pages: DataTablePageToken[] = []
  pages.push(0)
  const start = Math.max(1, currentPage - 1)
  const end = Math.min(totalPages - 2, currentPage + 1)
  if (start > 1) pages.push('ellipsis')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 2) pages.push('ellipsis')
  pages.push(totalPages - 1)
  return pages
}
