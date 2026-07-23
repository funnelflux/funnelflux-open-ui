import { useCallback } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import {
  Button,
  FormModal,
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  useToastApi,
} from '@/components/ui-kit'
import { PageForm } from '@/components/forms/PageForm'
import type { PageFormData } from '@/schemas/page'
import type { Page, PageType } from '@/types/entities'
import { NODE_TYPES, type LanderNodeParams, type OfferNodeParams } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { getErrorMessage } from '@/lib/utils'
import { pageNameForToast, useNodePageDetail } from './pageNodeModalShared'

interface PageNodeEditModalProps {
  nodeId: string | null
  pageType: PageType
  open: boolean
  onClose: () => void
}

export function PageNodeEditModal({ nodeId, pageType, open, onClose }: PageNodeEditModalProps) {
  const toast = useToastApi()
  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)
  const setPendingPageDraft = useFunnelEditorStore((s) => s.setPendingPageDraft)
  const pendingPageDraft = useFunnelEditorStore((s) =>
    nodeId ? s.pendingPageDrafts[nodeId] : undefined,
  )

  const expectedNodeType = pageType === 'lander' ? NODE_TYPES.lander : NODE_TYPES.offer
  const pageId =
    node?.data.nodeType === expectedNodeType
      ? String((node.data.params as LanderNodeParams | OfferNodeParams).pageId ?? '')
      : ''

  const { data: page, isError, error, noPage, pageLoading } = useNodePageDetail(pageId, open)
  const pendingDraft = pendingPageDraft?.page
  const initialData = mergePageNodeInitialData(page, pendingDraft, pageId, pageType)

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) onClose()
    },
    [onClose],
  )

  const handleSubmit = useCallback(
    (data: PageFormData) => {
      if (!nodeId || !node) return

      const existingParams = node.data.params as LanderNodeParams | OfferNodeParams
      const payload: Partial<Page> = { ...data }

      setPendingPageDraft(nodeId, {
        page: payload,
        original: page,
        isCreate: !pageId,
      })

      updateNodeData(nodeId, {
        label: data.pageName,
        params: {
          ...(node.data.params as object),
          pageId: String(data.idPage),
          pageName: data.pageName,
          accumulateUrlParams: existingParams.accumulateUrlParams ?? false,
          additionalTokens: existingParams.additionalTokens ?? [],
        },
      })

      toast.success(`${pageNameForToast(pageType)} changes staged. Save the funnel to persist them.`)
      onClose()
    },
    [nodeId, node, page, pageId, pageType, setPendingPageDraft, updateNodeData, toast, onClose],
  )

  const formReady = !noPage && Boolean(initialData) && (Boolean(pendingDraft) || !pageLoading) && !isError
  const entityLabel = pageType === 'offer' ? 'offer' : 'lander'

  if (formReady) {
    return (
      <PageForm
        open={open}
        onOpenChange={handleOpenChange}
        pageType={pageType}
        mode="edit"
        initialData={initialData}
        onSubmit={handleSubmit}
      />
    )
  }

  return (
    <FormModal open={open} onCancel={onClose} destroyOnHidden mask={{ closable: false }}>
      <FormModalHeader title={`Edit ${entityLabel}`} />
      <FormModalBody>
        {noPage ? (
          <p className="text-sm text-muted-foreground">
            This node has no {entityLabel} page assigned. Set a page ID from the funnel context or pick an{' '}
            {entityLabel} when creating the node.
          </p>
        ) : pageLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Icon name="loader-2" size="lg" animation="spin" aria-label="Loading" />
            Loading {entityLabel}…
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            {error ? getErrorMessage(error) : `Could not load ${entityLabel}.`}
          </p>
        ) : null}
      </FormModalBody>
      <FormModalFooter>
        <Button htmlType="button" onClick={onClose}>
          Close
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}

function mergePageNodeInitialData(
  page: Page | undefined,
  pendingDraft: Partial<Page> | undefined,
  pageId: string,
  pageType: PageType,
): Page | undefined {
  if (!page && !pendingDraft) return undefined

  return {
    ...(page ?? {}),
    ...(pendingDraft ?? {}),
    idPage: String(pendingDraft?.idPage ?? page?.idPage ?? pageId),
    pageType,
    pageName: String(pendingDraft?.pageName ?? page?.pageName ?? ''),
    url: String(pendingDraft?.url ?? page?.url ?? ''),
    redirectType: pendingDraft?.redirectType ?? page?.redirectType ?? '307',
    categoryId: pendingDraft?.categoryId ?? page?.categoryId,
    numberOfActions: pendingDraft?.numberOfActions ?? page?.numberOfActions,
    tags: pendingDraft?.tags ?? page?.tags ?? [],
    notes: pendingDraft?.notes ?? page?.notes ?? '',
    offerParams: pendingDraft?.offerParams ?? page?.offerParams,
    fluxifyParams: pendingDraft?.fluxifyParams ?? page?.fluxifyParams,
    isArchived: pendingDraft?.isArchived ?? page?.isArchived,
    customFields: pendingDraft?.customFields ?? page?.customFields,
  }
}
