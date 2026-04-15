import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { UserPlus } from 'lucide-react'
import { Tag } from 'antd'
import { Button, Switch, PageShell, DataTable, ConfirmModal, useToastApi } from '@/components/ui-kit'
import { editBtnColumn, deleteBtnColumn, enableBtnColumn, disableBtnColumn } from '@/components/ui-kit/data-table'
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

  const changeMutate = changeStatus.mutate
  const deleteMutate = deleteUser.mutate

  const handleToggleEnabled = useCallback(
    (user: ManagedUser) => {
      const newEnabled = !user.enabled
      changeMutate(
        { userIds: [user.id], enabled: newEnabled },
        {
          onSuccess: () => {
            toast.success(
              `User "${user.email}" ${newEnabled ? 'enabled' : 'disabled'}`,
            )
          },
          onError: (err) => {
            toast.error(`Failed to update user: ${getErrorMessage(err)}`)
          },
        },
      )
    },
    [changeMutate, toast],
  )

  const handleNavigateToEdit = useCallback(
    (row: ManagedUser) => {
      navigate(`/settings/users/${row.id}/edit`)
    },
    [navigate],
  )

  const handleRequestDelete = useCallback((row: ManagedUser) => {
    setDeleteTarget(row)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteMutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`User "${deleteTarget.email}" deleted`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(`Failed to delete user: ${getErrorMessage(err)}`)
        setDeleteTarget(null)
      },
    })
  }, [deleteMutate, deleteTarget, toast])

  const columns = useMemo<ColumnDef<ManagedUser, unknown>[]>(
    () => [
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
      },
      editBtnColumn<ManagedUser>(handleNavigateToEdit),
      enableBtnColumn<ManagedUser>(handleToggleEnabled, { hidden: (row) => row.enabled }),
      disableBtnColumn<ManagedUser>(handleToggleEnabled, { hidden: (row) => !row.enabled }),
      deleteBtnColumn<ManagedUser>(handleRequestDelete),
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row) =>
          [row.firstname, row.lastname].filter(Boolean).join(' '),
        cell: ({ getValue }) =>
          getValue() || <span className="text-muted-foreground">--</span>,
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
            onChange={() => handleToggleEnabled(row.original)}
          />
        ),
      },
    ],
    [handleNavigateToEdit, handleRequestDelete, handleToggleEnabled],
  )

  return (
    <PageShell fillHeight
      title="User Management"
      actions={
        <Button type="primary" onClick={() => navigate('/settings/users/new')}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Add User
        </Button>
      }
    >
      <DataTable<ManagedUser>
        data={users ?? []}
        columns={columns}
        getRowId={(row) => String(row.id)}
        loading={isLoading}
        tableConfigKey="settings-users"
        defaultSorting={[{ id: 'email', desc: false }]}
        noPagination
        emptyMessage="No users found."
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        description={`Are you sure you want to delete user "${deleteTarget?.email}"? This cannot be undone.`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  )
}
