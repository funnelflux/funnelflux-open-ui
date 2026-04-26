import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button, Input, Switch, Select, PageShell, useToastApi } from '@/components/ui-kit'
import { PermissionsGrid } from '@/components/settings/PermissionsGrid'
import { useUsers } from '@/api/hooks'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Permissions } from '@/types/api'
import type { ManagedUser, UserManagementData, UserProfile } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

const DEFAULT_PERMISSIONS: Permissions = {
  stats: { enabled: false, canView: false, canEditCustomViews: false },
  campaigns: { enabled: false, canView: false, canCreateNew: false, canEdit: false, canArchive: false, canDelete: false, restrictTo: [] },
  trafficSources: { enabled: false, canView: false, canCreateNew: false, canEdit: false, canArchive: false, canDelete: false, restrictTo: [] },
  offerSources: { enabled: false, canView: false, canCreateNew: false, canEdit: false, canArchive: false, canDelete: false, restrictTo: [] },
  offers: { enabled: false, canView: false, canCreateNew: false, canEdit: false, canArchive: false, canDelete: false, restrictTo: [], restrictToAssetIds: [], restrictToCategoryIds: [] },
  landers: { enabled: false, canView: false, canCreateNew: false, canEdit: false, canArchive: false, canDelete: false, restrictTo: [], restrictToAssetIds: [], restrictToCategoryIds: [] },
  systemLinks: { enabled: false, canView: false },
  storedLinks: { enabled: false, canView: false, canCreateNew: false, canEdit: false, canDelete: false, canResetStats: false },
  trafficFilters: { enabled: false, canView: false, canCreateNew: false, canEdit: false, canDelete: false, canApplyToPastStats: false },
  dataUpdates: { enabled: false, canUpdateConversions: false, canUpdateTrafficCost: false, canResetStats: false },
  systemUpdates: { enabled: false, canView: false, canInstallUpdate: false },
}

interface UserFormState {
  id: string
  login: string
  firstname: string
  lastname: string
  email: string
  password: string
  avatarURL: string
  isAdmin: boolean
  enabled: boolean
  permissions: Permissions
}

function normalizePermissions(value: unknown): Permissions {
  if (value && typeof value === 'object' && 'stats' in value) {
    return value as Permissions
  }
  return DEFAULT_PERMISSIONS
}

export function UserEditPage() {
  const navigate = useNavigate()
  const toast = useToastApi()
  const queryClient = useQueryClient()
  const { userId } = useParams()
  const isNew = !userId || userId === 'new'
  const { data: users } = useUsers()

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<UserFormState>({
    id: '',
    login: '',
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    avatarURL: '',
    isAdmin: false,
    enabled: true,
    permissions: DEFAULT_PERMISSIONS,
  })

  useEffect(() => {
    if (isNew || !userId) {
      setIsLoading(false)
      return
    }

    api
      .get<UserProfile>('/ui/userprofile/load/', { id: userId })
      .then((profile) => {
        setForm((current) => ({
          ...current,
          id: profile.id,
          login: profile.login,
          firstname: profile.firstname,
          lastname: profile.lastname,
          email: profile.email,
          avatarURL: profile.avatarURL ?? '',
          enabled: profile.enabled,
          isAdmin: profile.isAdmin,
          permissions: normalizePermissions(profile.permissions),
        }))
      })
      .catch(() => {
        const user = users?.find((entry) => String(entry.id) === userId)
        if (user) {
          setForm((current) => ({
            ...current,
            id: userId,
            login: '',
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            enabled: user.enabled,
            isAdmin: user.isAdmin,
          }))
        }
      })
      .finally(() => setIsLoading(false))
  }, [isNew, userId, users])

  const copyOptions = useMemo(
    () => (users ?? []).filter((user) => String(user.id) !== userId),
    [users, userId],
  )

  function userListLabel(user: ManagedUser): string {
    const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim()
    return name || user.email
  }

  async function loadUserRows(): Promise<ManagedUser[]> {
    return queryClient.fetchQuery({
      queryKey: queryKeys.userManagement.list(),
      queryFn: async () => {
        const data = await api.get<UserManagementData>('/ui/usermanagement/load/')
        return data.rows ?? []
      },
      staleTime: 0,
    })
  }

  const handleCopyRights = async (sourceUserId: string) => {
    try {
      const permissions = await api.post('/ui/usermanagement/copyRights/', {
        sourceUserId,
        targetUserId: form.id || userId || '',
      })
      setForm((current) => ({
        ...current,
        permissions: normalizePermissions(permissions),
      }))
      toast.success('Permissions copied')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const baselineRows = !form.id && form.password
        ? (users ?? await loadUserRows())
        : (users ?? [])

      await api.put('/ui/userprofile/save/', {
        id: form.id,
        login: form.login,
        firstname: form.firstname,
        lastname: form.lastname,
        email: form.email,
        avatarURL: form.avatarURL,
        isAdmin: form.isAdmin,
        enabled: form.enabled,
        permissions: form.permissions,
      })

      await queryClient.invalidateQueries({ queryKey: queryKeys.userManagement.all })

      let savedUserId = form.id
      if (form.password && !savedUserId) {
        const rows = await loadUserRows()
        const previousIds = new Set(baselineRows.map((row) => String(row.id)))
        const newRows = rows.filter((row) => !previousIds.has(String(row.id)))
        const emailMatches = form.email
          ? rows.filter((row) => row.email === form.email)
          : []

        savedUserId =
          (newRows.length === 1 ? String(newRows[0]!.id) : '') ||
          (emailMatches.length === 1 ? String(emailMatches[0]!.id) : '')

        if (!savedUserId) {
          throw new Error(
            'User profile was saved, but the new user id could not be resolved for password setup.',
          )
        }
      }

      if (form.password && savedUserId) {
        await api.put('/ui/userprofile/changePassword/', {
          idUser: savedUserId,
          newPassword: form.password,
        })
      }

      toast.success('User saved')
      navigate('/settings/users')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageShell title={isNew ? 'New User' : 'Edit User'}>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading user...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="login" className="block text-sm font-medium text-foreground">Login</label>
              <Input id="login" value={form.login} onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">Email</label>
              <Input id="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="firstname" className="block text-sm font-medium text-foreground">First name</label>
              <Input id="firstname" value={form.firstname} onChange={(event) => setForm((current) => ({ ...current, firstname: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastname" className="block text-sm font-medium text-foreground">Last name</label>
              <Input id="lastname" value={form.lastname} onChange={(event) => setForm((current) => ({ ...current, lastname: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
              <Input id="password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Copy Rights From</label>
              <Select
                onChange={(value) => void handleCopyRights(value)}
                placeholder="Select a user"
                className="w-full"
                options={copyOptions.map((user) => ({
                  value: String(user.id),
                  label: userListLabel(user),
                }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <label className="text-sm font-medium">Enabled</label>
              <Switch checked={form.enabled} onChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <label className="text-sm font-medium">Admin</label>
              <Switch checked={form.isAdmin} onChange={(checked) => setForm((current) => ({ ...current, isAdmin: checked }))} />
            </div>
          </div>

          <PermissionsGrid
            value={form.permissions}
            onChange={(permissions) => setForm((current) => ({ ...current, permissions }))}
          />

          <div className="flex justify-end gap-2">
            <Button htmlType="button" onClick={() => navigate('/settings/users')}>
              Cancel
            </Button>
            <Button type="primary" htmlType="button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </>
      )}
    </PageShell>
  )
}
