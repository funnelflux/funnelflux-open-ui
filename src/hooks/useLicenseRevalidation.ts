import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { LicenseRevalidationResponse } from '@/types/api'

export function useLicenseRevalidation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [...queryKeys.license.all, 'revalidate'],
    mutationFn: () => api.revalidateLicense<LicenseRevalidationResponse>(),
    meta: { licenseScope: 'bootstrap' },
    onSettled: async () => {
      await queryClient.refetchQueries({
        queryKey: queryKeys.license.session(),
        exact: true,
        type: 'active',
      })
    },
  })
}
