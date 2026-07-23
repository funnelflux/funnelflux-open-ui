import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Tag } from '@/components/ui-kit'
import { Button, Switch, PageShell, SearchToolbar, ConfirmModal, useToastApi, type PageShellBodyState } from '@/components/ui-kit'
import { DataTable } from '@/components/ui-kit/data-table'
import { editBtnColumn, deleteBtnColumn, enableBtnColumn, disableBtnColumn } from '@/components/ui-kit/data-table'
import { useUsers, useChangeUserStatus, useDeleteUser } from '@/api/hooks/useUserManagement'
import type { ManagedUser } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

function managedUserRowId(row: ManagedUser): string {
  return String(row.id)
}

const DEFAULT_SORTING: SortingState = [{ id: 'email', desc: false }]

export function UserManagementPage() {
  const navigate = useNavigate()
  const toast = useToastApi()
  const { data: users, isLoading, isError, error, refetch, isFetching } = useUsers()
  const changeStatus = useChangeUserStatus()
  const deleteUser = useDeleteUser()

  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)

  const filteredUsers = useMemo(() => {
    const list = users ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((user) =>
      `${user.email} ${user.firstname} ${user.lastname}`.toLowerCase().includes(needle),
    )
  }, [users, search])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

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

  const handleNavigateToCreate = useCallback(() => {
    navigate('/settings/users/new')
  }, [navigate])

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

  const bodyState: PageShellBodyState = isError
    ? {
        status: 'error',
        message: getErrorMessage(error),
        onRetry: () => void refetch(),
      }
    : { status: 'ready' }

  return (
    <PageShell fillHeight
      title="User Management"
      bodyState={bodyState}
      actions={
        <Button type="primary" iconName="user-plus" onClick={handleNavigateToCreate}>
          Add User
        </Button>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search users..."
        onRefresh={handleRefresh}
        refreshLoading={isFetching}
      />

      <DataTable<ManagedUser>
        data={filteredUsers}
        columns={columns}
        getRowId={managedUserRowId}
        loading={isLoading}
        tableConfigKey="settings-users"
        defaultSorting={DEFAULT_SORTING}
        noPagination
        emptyMessage={search ? 'No users match your search.' : 'No users found.'}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        description={`Are you sure you want to delete user "${deleteTarget?.email}"? This cannot be undone.`}
        confirmText="Delete"
        danger
        loading={deleteUser.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  )
}
