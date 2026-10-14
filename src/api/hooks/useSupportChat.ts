import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { loadCrisp } from '@/lib/crisp'
import { parseSupportChatConfig } from '@/schemas/apiBoundaries'

/**
 * Fetches the Crisp support chat config once per signed-in user and loads Crisp with it.
 * Returns true once the chat is available. Errors (e.g. an older backend without the
 * endpoint) leave Crisp unloaded and are not surfaced to the user.
 */
export function useSupportChat(userId: string): boolean {
  const { data } = useQuery({
    queryKey: queryKeys.supportChat.config(userId),
    queryFn: async () => parseSupportChatConfig(await api.get<unknown>('/ui/support/chat/load/')),
    retry: false,
    gcTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (data) loadCrisp(data, userId)
  }, [data, userId])

  return data !== undefined
}
