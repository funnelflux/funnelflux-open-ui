import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { Button, Tag, Switch } from 'antd'
import { PageShell, DataTable, ConfirmModal, EmptyState, useToastApi } from '@/components/ui-kit'
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

  const navigateRef = useRef(navigate)
  const handleToggleEnabledRef = useRef(handleToggleEnabled)
  const setDeleteTargetRef = useRef(setDeleteTarget)

  useEffect(() => {
    navigateRef.current = navigate
    handleToggleEnabledRef.current = handleToggleEnabled
    setDeleteTargetRef.current = setDeleteTarget
  }, [navigate, handleToggleEnabled, setDeleteTarget])

  const columns = useMemo<ColumnDef<ManagedUser, unknown>[]>(
    () => [
      {
        id: 'login',
        header: 'Username',
        accessorKey: 'login',
        cell: ({ row }) => <span className="font-medium">{row.original.login}</span>,
      },
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row) =>
          [row.firstname, row.lastname].filter(Boolean).join(' '),
        cell: ({ getValue }) =>
          getValue() || <span className="text-muted-foreground">--</span>,
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row }) =>
          row.original.email || <span className="text-muted-foreground">--</span>,
      },
      {
        id: 'isAdmin',
        header: 'Admin',
        accessorKey: 'isAdmin',
        cell: ({ row }) =>
          row.original.isAdmin ? (
            <Tag color="blue" className="text-xs">
              Admin
            </Tag>
          ) : null,
      },
      {
        id: 'enabled',
        header: 'Enabled',
        accessorKey: 'enabled',
        enableSorting: false,
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onChange={() => handleToggleEnabledRef.current(row.original)}
          />
        ),
      },
      {
        id: 'lastLogin',
        header: 'Last Login',
        accessorKey: 'lastLogin',
        cell: ({ row }) =>
          row.original.lastLogin || (
            <span className="text-muted-foreground">Never</span>
          ),
      },
      {
        id: 'actions',
        header: '',
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <InlineActions
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () =>
                  navigateRef.current(`/settings/users/${row.original.id}/edit`),
              },
              {
                label: row.original.enabled ? 'Disable' : 'Enable',
                icon: row.original.enabled ? UserX : UserCheck,
                onClick: () => handleToggleEnabledRef.current(row.original),
              },
              {
                label: 'Delete',
                icon: Trash2,
                onClick: () => setDeleteTargetRef.current(row.original),
                destructive: true,
              },
            ]}
          />
        ),
      },
    ],
    [],
  )

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
        <DataTable<ManagedUser>
          data={users ?? []}
          columns={columns}
          getRowId={(row) => String(row.id)}
          loading={isLoading}
          noPagination
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
