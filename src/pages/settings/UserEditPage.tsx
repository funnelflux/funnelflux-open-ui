import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Button, FormField, Input, PageShell, Select, Switch, useToastApi, type PageShellBodyState } from '@/components/ui-kit'
import { PermissionsGrid, type PermissionsGridHandle } from '@/components/settings/PermissionsGrid'
import { normalizePermissionsRestrictIds } from '@/lib/parseRestrictIds'
import { useUsers } from '@/api/hooks'
import { api } from '@/api/client'
import { executeObservedRequest } from '@/api/observedRequest'
import { queryKeys } from '@/api/queryKeys'
import type { AdminUserPasswordSetRequest, Permissions } from '@/types/api'
import type { ManagedUser } from '@/types/ui'
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(isNew)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const permissionsGridRef = useRef<PermissionsGridHandle>(null)

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: DEFAULT_USER_FORM_VALUES,
  })

  useEffect(() => {
    if (isNew || !userId) {
      form.reset(DEFAULT_USER_FORM_VALUES)
      setLoadError(null)
      setProfileLoaded(true)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setProfileLoaded(false)
    executeObservedRequest(queryClient, () =>
      api.get<unknown>('/ui/userprofile/load/', { id: userId }),
    )
      .then((raw) => {
        if (cancelled) return
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
        setProfileLoaded(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [form, isNew, userId, loadAttempt, queryClient])

  const handleRetryLoad = useCallback(() => {
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

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

  const handleCopyRights = useCallback(async (sourceUserId: string) => {
    if (!sourceUserId) return
    try {
      const raw = await executeObservedRequest(queryClient, () =>
        api.get<unknown>('/ui/userprofile/load/', { id: sourceUserId }),
      )
      const profile = parseUserProfile(raw)
      form.setValue('permissions', normalizePermissions(profile.permissions), { shouldDirty: true })
      toast.success('Permissions copied')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [form, queryClient, toast])

  const onSubmit = useCallback(async (data: UserEditFormData) => {
    if (!profileLoaded) {
      toast.error('User profile has not finished loading. Retry loading before saving.')
      return
    }
    setIsSaving(true)
    try {
      const permissions =
        permissionsGridRef.current?.flushRestrictDrafts() ??
        normalizePermissionsRestrictIds(data.permissions)
      const normalizedId = data.id.trim()
      const isCreatingUser = normalizedId === '' || normalizedId === '0'

      await executeObservedRequest(queryClient, () => api.put('/ui/userprofile/save/', {
        id: data.id,
        login: data.login,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        avatarURL: data.avatarURL,
        isAdmin: data.isAdmin,
        enabled: data.enabled,
        permissions,
        ...(isCreatingUser ? { password: data.password } : {}),
      }))

      await queryClient.invalidateQueries({ queryKey: queryKeys.userManagement.all })

      if (!isCreatingUser && data.password && data.id) {
        const passwordPayload: AdminUserPasswordSetRequest = {
          idUser: normalizedId,
          newPassword: data.password,
        }
        await executeObservedRequest(queryClient, () =>
          api.put('/ui/userprofile/changePassword/', passwordPayload),
        )
      }

      toast.success('User saved')
      navigate('/settings/users')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }, [profileLoaded, queryClient, toast, navigate])

  const bodyState: PageShellBodyState = isLoading
    ? { status: 'loading' }
    : loadError
      ? {
          status: 'error',
          message: `Failed to load user: ${loadError}`,
          onRetry: handleRetryLoad,
        }
      : { status: 'ready' }

  return (
    <PageShell title={isNew ? 'New User' : 'Edit User'} bodyState={bodyState}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            control={form.control}
            name="login"
            render={({ field, fieldState }) => (
              <FormField label="Login" htmlFor="login" error={fieldState.error?.message}>
                <Input id="login" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
              </FormField>
            )}
          />
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormField label="Email" htmlFor="email" error={fieldState.error?.message}>
                <Input id="email" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
              </FormField>
            )}
          />
          <Controller
            control={form.control}
            name="firstname"
            render={({ field }) => (
              <FormField label="First name" htmlFor="firstname">
                <Input id="firstname" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
              </FormField>
            )}
          />
          <Controller
            control={form.control}
            name="lastname"
            render={({ field }) => (
              <FormField label="Last name" htmlFor="lastname">
                <Input id="lastname" value={field.value} onChange={(event) => field.onChange(event.target.value)} />
              </FormField>
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormField label="Password" htmlFor="password" error={fieldState.error?.message}>
                <Input
                  id="password"
                  type="password"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormField>
            )}
          />
          <FormField label="Copy Rights From" htmlFor="copyRightsFrom">
            <Select
              id="copyRightsFrom"
              onChange={(value) => {
                if (typeof value === 'string' && value) {
                  void handleCopyRights(value)
                }
              }}
              placeholder="Select a user"
              className="w-full"
              options={copySelectOptions}
            />
          </FormField>
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
            <PermissionsGrid ref={permissionsGridRef} value={field.value} onChange={field.onChange} />
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
    </PageShell>
  )
}
