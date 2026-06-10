import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Card, FormField, Input, PageShell, useToastApi } from '@/components/ui-kit'
import { useChangeCurrentUserPassword } from '@/api/hooks'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage } from '@/lib/utils'
import { changePasswordSchema, type ChangePasswordFormData } from '@/schemas/account'

const DEFAULT_VALUES: ChangePasswordFormData = {
  oldPassword: '',
  newPassword: '',
  newPasswordConfirmation: '',
}

export function AccountSettingsPage() {
  const toast = useToastApi()
  const user = useAuthStore((s) => s.user)
  const changePassword = useChangeCurrentUserPassword()
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const onSubmit = handleSubmit((data) => {
    changePassword.mutate(data, {
      onSuccess: () => {
        toast.success('Password changed')
        reset(DEFAULT_VALUES)
      },
      onError: (err) => {
        toast.error(getErrorMessage(err))
      },
    })
  })

  return (
    <PageShell title="Account Settings" subtitle="Manage your own account and password.">
      <div className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(360px,1.2fr)]">
        <Card title="Account" className="ff-card-surface">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Login</dt>
              <dd className="mt-1 font-medium text-foreground">{user?.login || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium text-foreground">
                {[user?.firstname, user?.lastname].filter(Boolean).join(' ') || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium text-foreground">{user?.email || 'Not set'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Change Password" className="ff-card-surface">
          <form className="space-y-4" onSubmit={onSubmit}>
            <Alert
              type="info"
              showIcon
              message="Use your current password to set a new password. You will stay signed in after it changes."
            />

            <Controller
              name="oldPassword"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Current password"
                  htmlFor="oldPassword"
                  required
                  error={errors.oldPassword?.message}
                >
                  <Input
                    {...field}
                    id="oldPassword"
                    type="password"
                    autoComplete="current-password"
                    disabled={changePassword.isPending}
                  />
                </FormField>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="newPassword"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="New password"
                    htmlFor="newPassword"
                    required
                    error={errors.newPassword?.message}
                  >
                    <Input
                      {...field}
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      disabled={changePassword.isPending}
                    />
                  </FormField>
                )}
              />

              <Controller
                name="newPasswordConfirmation"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Confirm new password"
                    htmlFor="newPasswordConfirmation"
                    required
                    error={errors.newPasswordConfirmation?.message}
                  >
                    <Input
                      {...field}
                      id="newPasswordConfirmation"
                      type="password"
                      autoComplete="new-password"
                      disabled={changePassword.isPending}
                    />
                  </FormField>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="primary" htmlType="submit" loading={changePassword.isPending}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageShell>
  )
}
