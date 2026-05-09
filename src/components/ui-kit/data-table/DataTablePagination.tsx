import { useCallback, type ChangeEvent, type MouseEvent } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'

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

export interface DataTablePaginationProps {
  rangeLabel: string
  pageSize: number
  pageSizeOptions: number[]
  pageTokens: DataTablePageToken[]
  currentPage: number
  canPreviousPage: boolean
  canNextPage: boolean
  onPageSizeChange: (pageSize: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  onPageSelect: (pageIndex: number) => void
  showNavigation?: boolean
  pageSizeAriaLabel?: string
  className?: string
}

export function DataTablePagination({
  rangeLabel,
  pageSize,
  pageSizeOptions,
  pageTokens,
  currentPage,
  canPreviousPage,
  canNextPage,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
  onPageSelect,
  showNavigation = true,
  pageSizeAriaLabel = 'Rows per page',
  className,
}: DataTablePaginationProps) {
  const handlePageSizeSelect = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextPageSize = Number(event.target.value)
      onPageSizeChange(nextPageSize)
    },
    [onPageSizeChange],
  )

  const handlePageSelect = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const nextPageIndex = Number(event.currentTarget.dataset.pageIndex)
      if (!Number.isFinite(nextPageIndex)) return
      onPageSelect(nextPageIndex)
    },
    [onPageSelect],
  )

  return (
    <div className={cn('dt-footer', className)}>
      <div className="dt-footer-info">
        <span>{rangeLabel}</span>
        <select
          className="dt-page-size-select"
          value={pageSize}
          onChange={handlePageSizeSelect}
          aria-label={pageSizeAriaLabel}
        >
          {pageSizeOptions.map((sizeOption) => (
            <option key={sizeOption} value={sizeOption}>
              {sizeOption} / page
            </option>
          ))}
        </select>
      </div>
      {showNavigation ? (
        <div className="dt-footer-nav">
          <button
            className="dt-page-btn"
            disabled={!canPreviousPage}
            onClick={onPreviousPage}
            aria-label="Previous page"
          >
            <Icon name="chevron-left" size="sm" />
          </button>
          {pageTokens.map((pageToken, ellipsisIndex) =>
            pageToken === 'ellipsis' ? (
              <span
                key={`ellipsis-${ellipsisIndex}`}
                className="dt-page-btn"
                style={{ border: 'none', cursor: 'default', opacity: 0.5 }}
              >
                ...
              </span>
            ) : (
              <button
                key={pageToken}
                className={`dt-page-btn${pageToken === currentPage ? ' dt-page-btn--active' : ''}`}
                data-page-index={pageToken}
                onClick={handlePageSelect}
              >
                {pageToken + 1}
              </button>
            ),
          )}
          <button
            className="dt-page-btn"
            disabled={!canNextPage}
            onClick={onNextPage}
            aria-label="Next page"
          >
            <Icon name="chevron-right" size="sm" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
