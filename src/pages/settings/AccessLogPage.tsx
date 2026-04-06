import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText } from 'lucide-react'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/ui-kit'
import { DataTable } from '@/components/shared/DataTable'
import type { AccessLogEntry } from '@/types/ui'

export function AccessLogPage() {
  const { data: entries, isLoading } = useQuery({
    queryKey: queryKeys.accessLog.all,
    queryFn: () => api.get<AccessLogEntry[]>('/ui/accesslog/load/'),
  })

  const columns: ColumnDef<AccessLogEntry, unknown>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.date}</span>
      ),
    },
    {
      accessorKey: 'username',
      header: 'User',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.username}</span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => row.original.action,
    },
    {
      accessorKey: 'ip',
      header: 'IP',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.ip}</span>
      ),
    },
    {
      accessorKey: 'details',
      header: 'Details',
      cell: ({ row }) =>
        row.original.details || (
          <span className="text-muted-foreground">--</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="Access Log" />

      {!isLoading && (!entries || entries.length === 0) ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          message="No access log entries."
        />
      ) : (
        <DataTable
          columns={columns}
          data={entries ?? []}
          isLoading={isLoading}
          getRowId={(row) => row.id}
        />
      )}
    </div>
  )
}
