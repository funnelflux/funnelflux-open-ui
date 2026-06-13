import { z } from 'zod/v4'
import type { Permissions } from '@/types/api'

export const userEditSchema = z.object({
  id: z.string(),
  login: z.string().trim().min(1, 'Login is required'),
  firstname: z.string().trim(),
  lastname: z.string().trim(),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string(),
  avatarURL: z.string(),
  isAdmin: z.boolean(),
  enabled: z.boolean(),
  permissions: z.custom<Permissions>(),
}).superRefine((data, ctx) => {
  if (!data.id && data.password.trim().length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Password is required for new users',
      path: ['password'],
    })
  }
})

export type UserEditFormData = z.infer<typeof userEditSchema>
