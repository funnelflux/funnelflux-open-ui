import { z } from 'zod/v4'
import type { UserPasswordChangeRequest } from '@/types/api'

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    newPasswordConfirmation: z.string().min(1, 'Confirm the new password'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: 'Passwords do not match',
    path: ['newPasswordConfirmation'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema> & UserPasswordChangeRequest
