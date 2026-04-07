import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { FileText } from 'lucide-react'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { PageShell, DataGrid, EmptyState } from '@/components/ui-kit'
import type { AccessLogEntry } from '@/types/ui'

export function AccessLogPage() {
  const { data: entries, isLoading } = useQuery({
    queryKey: queryKeys.accessLog.all,
    queryFn: () => api.get<AccessLogEntry[]>('/ui/accesslog/load/'),
  })

  const columns: ColDef<AccessLogEntry>[] = [
    {
      colId: 'date',
      headerName: 'Date',
      field: 'date',
      cellRenderer: (params: { data: AccessLogEntry }) => (
        <span className="text-sm">{params.data.date}</span>
      ),
    },
    {
      colId: 'username',
      headerName: 'User',
      field: 'username',
      cellRenderer: (params: { data: AccessLogEntry }) => (
        <span className="font-medium">{params.data.username}</span>
      ),
    },
    {
      colId: 'action',
      headerName: 'Action',
      field: 'action',
    },
    {
      colId: 'ip',
      headerName: 'IP',
      field: 'ip',
      cellRenderer: (params: { data: AccessLogEntry }) => (
        <span className="font-mono text-xs">{params.data.ip}</span>
      ),
    },
    {
      colId: 'details',
      headerName: 'Details',
      field: 'details',
      cellRenderer: (params: { data: AccessLogEntry }) =>
        params.data.details || <span className="text-muted-foreground">--</span>,
    },
  ]

  return (
    <PageShell title="Access Log">
      {!isLoading && (!entries || entries.length === 0) ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          message="No access log entries."
        />
      ) : (
        <DataGrid<AccessLogEntry>
          rowData={entries ?? []}
          columnDefs={columns}
          getRowId={(p) => p.data.id}
          loading={isLoading}
        />
      )}
    </PageShell>
  )
}
