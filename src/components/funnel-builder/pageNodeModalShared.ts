import { useCallback, useMemo, useState } from 'react'
import { useToastApi, type SelectOption } from '@/components/ui-kit'
import { usePage, useSaveCategory } from '@/api/hooks'
import { FUNNEL_URL_TOKEN_OPTIONS } from '@/lib/urlTokens'
import { getErrorMessage } from '@/lib/utils'
import type { Page } from '@/types/entities'

export type PageNodeRedirectType = '301' | '307' | 'umr' | 'fluxify'

export const REDIRECT_SELECT_OPTIONS: SelectOption[] = [
  { value: '307', label: '307 Temporary Redirect' },
  { value: '301', label: '301 Permanent Redirect' },
  { value: 'umr', label: 'Ultimate Meta Refresh (UMR)' },
  { value: 'fluxify', label: 'Fluxify (reverse proxy)' },
]

export const REDIRECT_NOTES: Partial<Record<PageNodeRedirectType, string>> = {
  umr:
    "FunnelFlux's Ultimate Meta Refresh does not leak the referrer the way a double meta refresh can. " +
    'It is faster than a typical double meta refresh, but still slower than a 301 or 307 redirect.',
  '301': 'Permanent redirect. Search engines treat the destination URL as the canonical URL.',
  '307': 'Temporary redirect. Preserves the request method; good default for most tracking flows.',
  fluxify:
    'Advanced cloaking with Fluxify. Use when you need on-page rewriting, referrers/UA spoofing, or other Fluxify features.',
}

/** Matches PHP `PageCategory::DEFAULT_CATEGORY_NAME`. */
export const UNCATEGORIZED = 'Uncategorized'

export const TOKEN_SELECT_OPTIONS: SelectOption[] = [
  { value: '__pick__', label: '—' },
  ...FUNNEL_URL_TOKEN_OPTIONS.map((token) => ({ value: token, label: token })),
]

export function useNodePageDetail(pageId: string, open: boolean) {
  const query = usePage(pageId, {
    enabled: open && !!pageId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
  return {
    ...query,
    noPage: !pageId || pageId === '0',
    pageLoading: query.isLoading || (open && query.isFetching),
  }
}

export function useCategorySmartOptions(
  categories: Array<{ name?: string | null }> | undefined,
  tags: string[] | undefined,
): { categorySelectValue: string; categorySmartOptions: SelectOption[] } {
  const categoryNamesFromApi = useMemo(
    () => new Set((categories ?? []).map((category) => category.name).filter(Boolean)),
    [categories],
  )

  const rawTag = tags?.[0]
  const categorySelectValue = !rawTag || rawTag === UNCATEGORIZED ? '__none__' : rawTag
  const orphanCategory =
    rawTag && rawTag !== UNCATEGORIZED && !categoryNamesFromApi.has(rawTag) ? rawTag : null

  const categorySmartOptions = useMemo<SelectOption[]>(() => {
    const out: SelectOption[] = [{ value: '__none__', label: '—' }]
    if (orphanCategory) out.push({ value: orphanCategory, label: orphanCategory })
    for (const category of categories?.filter((item) => item.name && item.name !== UNCATEGORIZED) ?? []) {
      out.push({ value: category.name as string, label: category.name as string })
    }
    return out
  }, [categories, orphanCategory])

  return { categorySelectValue, categorySmartOptions }
}

interface UsePageCategoryCreatorArgs {
  onCreated: (name: string) => void
}

export function usePageCategoryCreator({ onCreated }: UsePageCategoryCreatorArgs) {
  const toast = useToastApi()
  const saveCategory = useSaveCategory()
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const openAddCategoryModal = useCallback(() => {
    setNewCategoryName('')
    setAddCategoryOpen(true)
  }, [])

  const closeAddCategoryModal = useCallback(() => {
    setAddCategoryOpen(false)
    setNewCategoryName('')
  }, [])

  const handleConfirmAddCategory = useCallback(async () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error('Enter a category name')
      return
    }
    try {
      await saveCategory.mutateAsync({ entityType: 'page', name })
      toast.success('Category saved')
      onCreated(name)
      closeAddCategoryModal()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [closeAddCategoryModal, newCategoryName, onCreated, saveCategory, toast])

  return {
    addCategoryOpen,
    newCategoryName,
    setNewCategoryName,
    openAddCategoryModal,
    closeAddCategoryModal,
    handleConfirmAddCategory,
    addCategorySaving: saveCategory.isPending,
  }
}

export function openNodePageUrl(urlValue: string, toast: ReturnType<typeof useToastApi>): void {
  const url = urlValue.trim()
  if (!url || !/^https?:\/\//i.test(url)) {
    toast.error('Enter a valid http(s) URL first')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
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
