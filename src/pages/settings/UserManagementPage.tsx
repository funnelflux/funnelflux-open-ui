import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColDef } from 'ag-grid-community'
import { Pencil, Trash2, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { Button, Tag, Switch } from 'antd'
import { PageShell, DataGrid, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
import { InlineActions } from '@/components/shared/InlineActions'
import { useUsers, useChangeUserStatus, useDeleteUser } from '@/api/hooks/useUserManagement'
import type { ManagedUser } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

export function UserManagementPage() {
  const navigate = useNavigate()
  const toast = useToastApi()
  const { data: users, isLoading } = useUsers()
  const changeStatus = useChangeUserStatus()
  const deleteUser = useDeleteUser()

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)

  function handleToggleEnabled(user: ManagedUser) {
    const newEnabled = !user.enabled
    changeStatus.mutate(
      { userIds: [user.id], enabled: newEnabled },
      {
        onSuccess: () => {
          toast.success(
            `User "${user.login}" ${newEnabled ? 'enabled' : 'disabled'}`,
          )
        },
        onError: (err) => {
          toast.error(`Failed to update user: ${getErrorMessage(err)}`)
        },
      },
    )
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`User "${deleteTarget.login}" deleted`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(`Failed to delete user: ${getErrorMessage(err)}`)
        setDeleteTarget(null)
      },
    })
  }

  const columns: ColDef<ManagedUser>[] = [
    {
      colId: 'login',
      headerName: 'Username',
      field: 'login',
      cellRenderer: (params: { data: ManagedUser }) => (
        <span className="font-medium">{params.data.login}</span>
      ),
    },
    {
      colId: 'name',
      headerName: 'Name',
      valueGetter: (params: { data: ManagedUser | undefined }) => {
        if (!params.data) return ''
        return [params.data.firstname, params.data.lastname].filter(Boolean).join(' ')
      },
      cellRenderer: (params: { value: string }) =>
        params.value || <span className="text-muted-foreground">--</span>,
    },
    {
      colId: 'email',
      headerName: 'Email',
      field: 'email',
      cellRenderer: (params: { data: ManagedUser }) =>
        params.data.email || <span className="text-muted-foreground">--</span>,
    },
    {
      colId: 'isAdmin',
      headerName: 'Admin',
      field: 'isAdmin',
      cellRenderer: (params: { data: ManagedUser }) =>
        params.data.isAdmin ? (
          <Tag color="blue" className="text-xs">
            Admin
          </Tag>
        ) : null,
    },
    {
      colId: 'enabled',
      headerName: 'Enabled',
      field: 'enabled',
      cellRenderer: (params: { data: ManagedUser }) => (
        <Switch
          checked={params.data.enabled}
          onChange={() => handleToggleEnabled(params.data)}
        />
      ),
    },
    {
      colId: 'lastLogin',
      headerName: 'Last Login',
      field: 'lastLogin',
      cellRenderer: (params: { data: ManagedUser }) =>
        params.data.lastLogin || <span className="text-muted-foreground">Never</span>,
    },
    {
      colId: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      cellRenderer: (params: { data: ManagedUser }) => (
        <InlineActions
          actions={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => navigate(`/settings/users/${params.data.id}/edit`),
            },
            {
              label: params.data.enabled ? 'Disable' : 'Enable',
              icon: params.data.enabled ? UserX : UserCheck,
              onClick: () => handleToggleEnabled(params.data),
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => setDeleteTarget(params.data),
              destructive: true,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageShell
      title="User Management"
      actions={
        <Button type="primary" onClick={() => navigate('/settings/users/new')}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Add User
        </Button>
      }
    >
      {!isLoading && (!users || users.length === 0) ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          message="No users found."
        />
      ) : (
        <DataGrid<ManagedUser>
          rowData={users ?? []}
          columnDefs={columns}
          getRowId={(p) => String(p.data.id)}
          loading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        description={`Are you sure you want to delete user "${deleteTarget?.login}"? This cannot be undone.`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  )
}
