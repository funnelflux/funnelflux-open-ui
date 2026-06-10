import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { ChangePasswordFormData } from '@/schemas/account'

export function useChangeCurrentUserPassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordFormData) =>
      api.post('/ui/userprofile/changePassword/', body),
  })
}
