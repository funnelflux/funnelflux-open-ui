import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { normalizeDomainsFromApiList, normalizeDomainValue } from '@/lib/normalizeDomainsFromApi'

export interface WebRootDomainResponse {
  domain: string
  webRoot: string
  licenseResponse?: unknown
}

function invalidateDomainState(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.domains.all })
  qc.invalidateQueries({ queryKey: queryKeys.systemLinks.all })
}

export function useDomains() {
  return useQuery({
    queryKey: queryKeys.domains.list(),
    queryFn: async () => {
      const [rawList, rawDefault] = await Promise.all([
        api.get<unknown>('/system/domain/list/'),
        api.get<unknown>('/system/domain/default/'),
      ])
      const trackingDefault = normalizeDomainValue(rawDefault)
      return normalizeDomainsFromApiList(rawList, trackingDefault)
    },
  })
}

export function useDefaultTrackingDomain() {
  return useQuery({
    queryKey: queryKeys.domains.trackingDefault(),
    queryFn: async () => normalizeDomainValue(await api.get<unknown>('/system/domain/default/')),
  })
}

export function useWebRootDomain() {
  return useQuery({
    queryKey: queryKeys.domains.webRoot(),
    queryFn: () => api.get<WebRootDomainResponse>('/system/domain/webroot/'),
  })
}

/** PHP reads `domain` from the query string for POST /system/domain/save/. */
export function useSaveDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainName: string) =>
      api.post<unknown>('/system/domain/save/', undefined, { domain: domainName }),
    onSuccess: () => {
      invalidateDomainState(qc)
    },
  })
}

/** PHP accepts PUT with query params for domain renames. */
export function useEditDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ oldDomain, newDomain }: { oldDomain: string; newDomain: string }) =>
      api.put<unknown>('/system/domain/save/', undefined, { oldDomain, newDomain }),
    onSuccess: () => {
      invalidateDomainState(qc)
    },
  })
}

/** PHP requires query param `domain` (hostname), not `id`. */
export function useDeleteDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainName: string) =>
      api.delete('/system/domain/delete/', { domain: domainName }),
    onSuccess: () => {
      invalidateDomainState(qc)
    },
  })
}

/** PHP accepts PUT with query param `domain`. */
export function useSetDefaultTrackingDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainName: string) =>
      api.put('/system/domain/default/', undefined, { domain: domainName }),
    onSuccess: () => {
      invalidateDomainState(qc)
    },
  })
}

/** Updates application.webRoot and triggers backend license-domain attachment. */
export function useSetWebRootDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainName: string) =>
      api.put<WebRootDomainResponse>('/system/domain/webroot/', undefined, { domain: domainName }),
    onSuccess: () => {
      invalidateDomainState(qc)
    },
  })
}

export const useSetDefaultDomain = useSetDefaultTrackingDomain
