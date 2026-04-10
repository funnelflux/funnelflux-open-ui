import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { UserPlus } from 'lucide-react'
import { Button, Tag, Switch } from 'antd'
import { PageShell, DataTable, ConfirmModal, useToastApi } from '@/components/ui-kit'
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
      editBtnColumn<ManagedUser>((row) => navigateRef.current(`/settings/users/${row.id}/edit`)),
      enableBtnColumn<ManagedUser>((row) => handleToggleEnabledRef.current(row), { hidden: (row) => row.enabled }),
      disableBtnColumn<ManagedUser>((row) => handleToggleEnabledRef.current(row), { hidden: (row) => !row.enabled }),
      deleteBtnColumn<ManagedUser>((row) => setDeleteTargetRef.current(row)),
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
    ],
    [],
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
        noPagination
        emptyMessage="No users found."
      />

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
