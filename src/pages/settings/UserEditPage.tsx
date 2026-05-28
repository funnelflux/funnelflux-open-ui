import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Input, PageShell, Select, Switch, useToastApi } from '@/components/ui-kit'
import { PermissionsGrid } from '@/components/settings/PermissionsGrid'
import { useUsers } from '@/api/hooks'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { AdminUserPasswordSetRequest, Permissions } from '@/types/api'
import type { ManagedUser, UserManagementData } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'
import { userEditSchema, type UserEditFormData } from '@/schemas/userEdit'
import { parseUserProfile } from '@/schemas/apiBoundaries'

const DEFAULT_PERMISSIONS: Permissions = {
  stats: { enabled: false, canView: false, canEditCustomViews: false },
  campaigns: {
    enabled: false,
    canView: false,
    canCreateNew: false,
    canEdit: false,
    canArchive: false,
    canDelete: false,
    restrictTo: [],
  },
  trafficSources: {
    enabled: false,
    canView: false,
    canCreateNew: false,
    canEdit: false,
    canArchive: false,
    canDelete: false,
    restrictTo: [],
  },
  offerSources: {
    enabled: false,
    canView: false,
    canCreateNew: false,
    canEdit: false,
    canArchive: false,
    canDelete: false,
    restrictTo: [],
  },
  offers: {
    enabled: false,
    canView: false,
    canCreateNew: false,
    canEdit: false,
    canArchive: false,
    canDelete: false,
    restrictTo: [],
    restrictToAssetIds: [],
    restrictToCategoryIds: [],
  },
  landers: {
    enabled: false,
    canView: false,
    canCreateNew: false,
    canEdit: false,
    canArchive: false,
    canDelete: false,
    restrictTo: [],
    restrictToAssetIds: [],
    restrictToCategoryIds: [],
  },
  systemLinks: { enabled: false, canView: false },
  storedLinks: {
    enabled: false,
    canView: false,
    canCreateNew: false,
    canEdit: false,
    canDelete: false,
    canResetStats: false,
  },
  trafficFilters: {
    enabled: false,
    canView: false,
    canCreateNew: false,
    canEdit: false,
    canDelete: false,
    canApplyToPastStats: false,
  },
  dataUpdates: {
    enabled: false,
    canUpdateConversions: false,
    canUpdateTrafficCost: false,
    canResetStats: false,
  },
  systemUpdates: { enabled: false, canView: false, canInstallUpdate: false },
}

const DEFAULT_USER_FORM_VALUES: UserEditFormData = {
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
}

function normalizePermissions(value: unknown): Permissions {
  if (value && typeof value === 'object' && 'stats' in value) {
    return value as Permissions
  }
  return DEFAULT_PERMISSIONS
}

function userListLabel(user: ManagedUser): string {
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim()
  return name || user.email
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

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: DEFAULT_USER_FORM_VALUES,
  })

  useEffect(() => {
    if (isNew || !userId) {
      form.reset(DEFAULT_USER_FORM_VALUES)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    api
      .get<unknown>('/ui/userprofile/load/', { id: userId })
      .then((raw) => {
        const profile = parseUserProfile(raw)
        form.reset({
          ...DEFAULT_USER_FORM_VALUES,
          id: String(profile.id),
          login: profile.login,
          firstname: profile.firstname,
          lastname: profile.lastname,
          email: profile.email,
          avatarURL: profile.avatarURL ?? '',
          enabled: profile.enabled,
          isAdmin: profile.isAdmin,
          permissions: normalizePermissions(profile.permissions),
        })
      })
      .catch(() => {
        const user = users?.find((entry) => String(entry.id) === userId)
        if (!user) return
        form.reset({
          ...DEFAULT_USER_FORM_VALUES,
          id: userId,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          enabled: user.enabled,
          isAdmin: user.isAdmin,
        })
      })
      .finally(() => setIsLoading(false))
  }, [form, isNew, userId, users])

  const copyOptions = useMemo(
    () => (users ?? []).filter((user) => String(user.id) !== userId),
    [users, userId],
  )
  const copySelectOptions = useMemo(
    () =>
      copyOptions.map((user) => ({
        value: String(user.id),
        label: userListLabel(user),
      })),
    [copyOptions],
  )

  const loadUserRows = useCallback(async (): Promise<ManagedUser[]> => {
    return queryClient.fetchQuery({
      queryKey: queryKeys.userManagement.list(),
      queryFn: async () => {
        const data = await api.get<UserManagementData>('/ui/usermanagement/load/')
        return data.rows ?? []
      },
      staleTime: 0,
    })
  }, [queryClient])

  const handleCopyRights = useCallback(async (sourceUserId: string) => {
    try {
      const permissions = await api.post('/ui/usermanagement/copyRights/', {
        sourceUserId,
        targetUserId: form.getValues('id') || userId || '',
      })
      form.setValue('permissions', normalizePermissions(permissions), { shouldDirty: true })
      toast.success('Permissions copied')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [form, toast, userId])

  const onSubmit = useCallback(async (data: UserEditFormData) => {
    setIsSaving(true)
    try {
      const baselineRows =
        !data.id && data.password ? (users ?? (await loadUserRows())) : (users ?? [])

      await api.put('/ui/userprofile/save/', {
        id: data.id,
        login: data.login,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        avatarURL: data.avatarURL,
        isAdmin: data.isAdmin,
        enabled: data.enabled,
        permissions: data.permissions,
      })

      await queryClient.invalidateQueries({ queryKey: queryKeys.userManagement.all })

      let savedUserId = data.id
      if (data.password && !savedUserId) {
        const rows = await loadUserRows()
        const previousIds = new Set(baselineRows.map((row) => String(row.id)))
        const newRows = rows.filter((row) => !previousIds.has(String(row.id)))
        const emailMatches = data.email
          ? rows.filter((row) => row.email === data.email)
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

      if (data.password && savedUserId) {
        const passwordPayload: AdminUserPasswordSetRequest = {
          idUser: savedUserId,
          newPassword: data.password,
        }
        await api.put('/ui/userprofile/changePassword/', passwordPayload)
      }

      toast.success('User saved')
      navigate('/settings/users')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }, [users, loadUserRows, queryClient, toast, navigate])

  return (
    <PageShell title={isNew ? 'New User' : 'Edit User'}>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading user...</div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="login" className="block text-sm font-medium text-foreground">Login</label>
              <Controller
                control={form.control}
                name="login"
                render={({ field }) => (
                  <Input id="login" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
                )}
              />
              {form.formState.errors.login && (
                <p className="text-xs text-destructive">{form.formState.errors.login.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">Email</label>
              <Controller
                control={form.control}
                name="email"
                render={({ field }) => (
                  <Input id="email" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
                )}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="firstname" className="block text-sm font-medium text-foreground">First name</label>
              <Controller
                control={form.control}
                name="firstname"
                render={({ field }) => (
                  <Input id="firstname" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastname" className="block text-sm font-medium text-foreground">Last name</label>
              <Controller
                control={form.control}
                name="lastname"
                render={({ field }) => (
                  <Input id="lastname" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <Input
                    id="password"
                    type="password"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-foreground">Copy Rights From</span>
              <Select
                onChange={(value) => void handleCopyRights(value)}
                placeholder="Select a user"
                className="w-full"
                options={copySelectOptions}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">Enabled</span>
              <Controller
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <Switch checked={field.value} onChange={(checked) => field.onChange(checked)} />
                )}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">Admin</span>
              <Controller
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <Switch checked={field.value} onChange={(checked) => field.onChange(checked)} />
                )}
              />
            </div>
          </div>

          <Controller
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <PermissionsGrid value={field.value} onChange={field.onChange} />
            )}
          />

          <div className="flex justify-end gap-2">
            <Button htmlType="button" onClick={() => navigate('/settings/users')}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSaving} disabled={isSaving}>
              Save
            </Button>
          </div>
        </form>
      )}
    </PageShell>
  )
}
