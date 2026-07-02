import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { format } from 'date-fns'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { PageShell, type PageShellBodyState } from '@/components/ui-kit'
import { DataTable } from '@/components/ui-kit/data-table'
import { getErrorMessage } from '@/lib/utils'
import type { AccessLogData, AccessLogEntry } from '@/types/ui'

/** Composite key; API rows have no `id`. */
function accessLogRowId(row: AccessLogEntry): string {
  return `${row.timestamp}-${row.ip}-${row.login}-${row.event}`
}

const DEFAULT_SORTING: SortingState = [{ id: 'timestamp', desc: true }]

export function AccessLogPage() {
  const { data: entries, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.accessLog.all,
    queryFn: async () => {
      const res = await api.get<AccessLogData>('/ui/accesslog/load/')
      return res.rows ?? []
    },
  })

  const columns = useMemo<ColumnDef<AccessLogEntry, unknown>[]>(
    () => [
      {
        id: 'timestamp',
        header: 'Date',
        accessorKey: 'timestamp',
        cell: ({ row }) => {
          const seconds = row.original.timestamp
          const date =
            typeof seconds === 'number' && Number.isFinite(seconds)
              ? new Date(seconds * 1000)
              : null
          return (
            <span className="text-sm">
              {date && !Number.isNaN(date.getTime()) ? format(date, 'PPpp') : '—'}
            </span>
          )
        },
      },
      {
        id: 'login',
        header: 'User',
        accessorKey: 'login',
        cell: ({ row }) => <span className="font-medium">{row.original.login}</span>,
      },
      {
        id: 'event',
        header: 'Event',
        accessorKey: 'event',
      },
      {
        id: 'ip',
        header: 'IP',
        accessorKey: 'ip',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span>,
      },
      {
        id: 'country',
        header: 'Country',
        accessorKey: 'country',
        cell: ({ row }) =>
          row.original.country || <span className="text-muted-foreground">—</span>,
      },
    ],
    [],
  )

  const bodyState: PageShellBodyState = isError
    ? {
        status: 'error',
        message: getErrorMessage(error),
        onRetry: () => void refetch(),
      }
    : { status: 'ready' }

  return (
    <PageShell title="Access Log" fillHeight bodyState={bodyState}>
      <DataTable<AccessLogEntry>
        data={entries ?? []}
        columns={columns}
        getRowId={accessLogRowId}
        loading={isLoading}
        tableConfigKey="settings-access-log"
        defaultSorting={DEFAULT_SORTING}
        noPagination
        emptyMessage="No access log entries."
      />
    </PageShell>
  )
}
