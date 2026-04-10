import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { PageShell, DataTable } from '@/components/ui-kit'
import type { AccessLogEntry } from '@/types/ui'

export function AccessLogPage() {
  const { data: entries, isLoading } = useQuery({
    queryKey: queryKeys.accessLog.all,
    queryFn: () => api.get<AccessLogEntry[]>('/ui/accesslog/load/'),
  })

  const columns = useMemo<ColumnDef<AccessLogEntry, unknown>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        accessorKey: 'date',
        cell: ({ row }) => <span className="text-sm">{row.original.date}</span>,
      },
      {
        id: 'username',
        header: 'User',
        accessorKey: 'username',
        cell: ({ row }) => <span className="font-medium">{row.original.username}</span>,
      },
      {
        id: 'action',
        header: 'Action',
        accessorKey: 'action',
      },
      {
        id: 'ip',
        header: 'IP',
        accessorKey: 'ip',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span>,
      },
      {
        id: 'details',
        header: 'Details',
        accessorKey: 'details',
        cell: ({ row }) =>
          row.original.details || <span className="text-muted-foreground">--</span>,
      },
    ],
    [],
  )

  return (
    <PageShell title="Access Log" fillHeight>
      <DataTable<AccessLogEntry>
        data={entries ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={isLoading}
        noPagination
        emptyMessage="No access log entries."
      />
    </PageShell>
  )
}
