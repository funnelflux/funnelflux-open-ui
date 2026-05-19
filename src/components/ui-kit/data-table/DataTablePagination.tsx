import { useCallback, type ChangeEvent, type MouseEvent } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'
import type { DataTablePageToken } from './DataTablePaginationTokens'

/** Re-exported for backward compatibility (older imports from this module). Canonical: {@link ./DataTablePaginationTokens}. */
// eslint-disable-next-line react-refresh/only-export-components -- thin re-export only; real impl is in DataTablePaginationTokens.ts
export { buildDataTablePageTokens } from './DataTablePaginationTokens'

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
  showPageSizeSelect?: boolean
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
  showPageSizeSelect = true,
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
        {showPageSizeSelect ? (
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
        ) : null}
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
