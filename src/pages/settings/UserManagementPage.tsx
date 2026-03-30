import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { RowActionsMenu } from '@/components/shared/RowActionsMenu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import { useUsers, useChangeUserStatus, useDeleteUser } from '@/api/hooks/useUserManagement'
import type { ManagedUser } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

export function UserManagementPage() {
  const navigate = useNavigate()
  const toast = useToast()
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

  const columns: ColumnDef<ManagedUser, unknown>[] = [
    {
      accessorKey: 'login',
      header: 'Username',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.login}</span>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const { firstname, lastname } = row.original
        const name = [firstname, lastname].filter(Boolean).join(' ')
        return name || <span className="text-muted-foreground">--</span>
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) =>
        row.original.email || (
          <span className="text-muted-foreground">--</span>
        ),
    },
    {
      accessorKey: 'isAdmin',
      header: 'Admin',
      cell: ({ row }) =>
        row.original.isAdmin ? (
          <Badge variant="default" className="text-xs">
            Admin
          </Badge>
        ) : null,
    },
    {
      accessorKey: 'enabled',
      header: 'Enabled',
      cell: ({ row }) => (
        <Switch
          checked={row.original.enabled}
          onCheckedChange={() => handleToggleEnabled(row.original)}
        />
      ),
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) =>
        row.original.lastLogin || (
          <span className="text-muted-foreground">Never</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      cell: ({ row }) => (
        <RowActionsMenu
          actions={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => navigate(`/settings/users/${row.original.id}/edit`),
            },
            {
              label: row.original.enabled ? 'Disable' : 'Enable',
              icon: row.original.enabled ? UserX : UserCheck,
              onClick: () => handleToggleEnabled(row.original),
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => setDeleteTarget(row.original),
              destructive: true,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="User Management">
        <Button size="sm" onClick={() => navigate('/settings/users/new')}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Add User
        </Button>
      </PageHeader>

      {!isLoading && (!users || users.length === 0) ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          message="No users found."
        />
      ) : (
        <DataTable
          columns={columns}
          data={users ?? []}
          isLoading={isLoading}
          getRowId={(row) => String(row.id)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        description={`Are you sure you want to delete user "${deleteTarget?.login}"? This cannot be undone.`}
        confirmText="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
