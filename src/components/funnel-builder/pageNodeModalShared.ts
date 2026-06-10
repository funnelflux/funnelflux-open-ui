import type { SelectOption } from '@/components/ui-kit'
import { usePage } from '@/api/hooks'
import { FUNNEL_URL_TOKEN_OPTIONS } from '@/lib/urlTokens'
import type { Page } from '@/types/entities'

export const TOKEN_SELECT_OPTIONS: SelectOption[] = [
  { value: '__pick__', label: '—' },
  ...FUNNEL_URL_TOKEN_OPTIONS.map((token) => ({ value: token, label: token })),
]

export function useNodePageDetail(pageId: string, open: boolean) {
  const query = usePage(pageId, {
    enabled: open && !!pageId,
    staleTime: Infinity,
    refetchOnMount: false,
  })
  return {
    ...query,
    noPage: !pageId || pageId === '0',
    pageLoading: query.isLoading || (open && query.isFetching),
  }
}

export function toNodeAdditionalTokens(
  rows: Array<{ field: string; token: string }> | undefined,
): Array<{ field: string; token: string }> | undefined {
  const tokens =
    rows
      ?.filter((row) => row.field.trim() !== '')
      .map((row) => ({ field: row.field.trim(), token: row.token })) ?? []
  return tokens.length > 0 ? tokens : undefined
}

export function pageNameForToast(pageType: Page['pageType']): string {
  return pageType === 'offer' ? 'Offer' : 'Lander'
}
