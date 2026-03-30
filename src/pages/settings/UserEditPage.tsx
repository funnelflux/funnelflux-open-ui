import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/Toaster'
import { PermissionsGrid } from '@/components/settings/PermissionsGrid'
import { useUsers } from '@/api/hooks'
import { api } from '@/api/client'
import type { Permissions } from '@/types/api'
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
  const toast = useToast()
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

    const user = users?.find((entry) => String(entry.id) === userId)

    api.get('/ui/usermanagement/rights/', { idUser: userId })
      .then((permissions) => {
        setForm((current) => ({
          ...current,
          id: userId,
          login: user?.login ?? '',
          firstname: user?.firstname ?? '',
          lastname: user?.lastname ?? '',
          email: user?.email ?? '',
          enabled: user?.enabled ?? true,
          isAdmin: user?.isAdmin ?? false,
          permissions: normalizePermissions(permissions),
        }))
      })
      .catch(() => {
        if (user) {
          setForm((current) => ({
            ...current,
            id: userId,
            login: user.login,
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
    [userId, users],
  )

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

      let savedUserId = form.id
      if (!savedUserId) {
        const refreshedUsers = await api.get<Array<{ id: number; login: string }>>('/ui/usermanagement/load/')
        savedUserId = String(refreshedUsers.find((user) => user.login === form.login)?.id ?? '')
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
    <div className="space-y-6">
      <PageHeader title={isNew ? 'New User' : 'Edit User'} />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading user...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="login">Login</Label>
              <Input id="login" value={form.login} onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstname">First name</Label>
              <Input id="firstname" value={form.firstname} onChange={(event) => setForm((current) => ({ ...current, firstname: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastname">Last name</Label>
              <Input id="lastname" value={form.lastname} onChange={(event) => setForm((current) => ({ ...current, lastname: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Copy Rights From</Label>
              <Select onValueChange={(value) => void handleCopyRights(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {copyOptions.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.login}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Enabled</Label>
              <Switch checked={form.enabled} onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Admin</Label>
              <Switch checked={form.isAdmin} onCheckedChange={(checked) => setForm((current) => ({ ...current, isAdmin: checked }))} />
            </div>
          </div>

          <PermissionsGrid
            value={form.permissions}
            onChange={(permissions) => setForm((current) => ({ ...current, permissions }))}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/settings/users')}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
