import { z } from 'zod/v4'
import { HTTP_URL_ERROR, httpUrlStringSchema, isValidHttpUrl } from '@/lib/validateHttpUrl'

export type { FluxifyParams, OfferParams, Page } from '@/types/entities'

const contentRewriterParamsSchema = z.object({
  map: z.array(z.object({ key: z.string(), value: z.string() })),
  headerCode: z.string(),
  footerCode: z.string(),
})

const referrerAndUASpooferParamsSchema = z.object({
  referrers: z.array(
    z.string().trim().refine(isValidHttpUrl, { message: HTTP_URL_ERROR }),
  ),
  userAgents: z.array(z.string()),
})

const urlKeyValuePairSchema = z
  .object({
    key: z.string(),
    value: z.string(),
  })
  .superRefine((pair, ctx) => {
    if (pair.key.trim() && !isValidHttpUrl(pair.key)) {
      ctx.addIssue({ code: 'custom', message: HTTP_URL_ERROR, path: ['key'] })
    }
    if (pair.value.trim() && !isValidHttpUrl(pair.value)) {
      ctx.addIssue({ code: 'custom', message: HTTP_URL_ERROR, path: ['value'] })
    }
  })

/** Mirrors {@link FluxifyParams} for form validation. */
const fluxifyParamsSchema = z.object({
  enableCache: z.boolean(),
  enableDirectTrafficProtection: z.boolean(),
  enableLinkRewriter: z.boolean(),
  enableContentRewriter: z.boolean(),
  enableVideoAutoPlayBreaker: z.boolean(),
  enableExitPopupBreaker: z.boolean(),
  enableAnalyticsBreaker: z.boolean(),
  enableReferrerAndUASpoofer: z.boolean(),
  linkRewriterParams: z
    .object({
      map: z.array(urlKeyValuePairSchema),
    })
    .optional(),
  contentRewriterParams: contentRewriterParamsSchema.optional(),
  referrerAndUASpooferParams: referrerAndUASpooferParamsSchema.optional(),
})

/**
 * Page (lander/offer) form. Aligns with OpenAPI `#/definitions/Page` / {@link Page}.
 * For create, set `idPage` with `generateEntityId()` from `@/lib/id-generator` before POST.
 * `categoryId` and `numberOfActions` are app/runtime extensions on {@link Page} in `entities.ts`.
 */
export const pageSchema = z.object({
  idPage: z.string().min(1, 'ID is required'),
  pageType: z.enum(['lander', 'offer']),
  pageName: z.string().min(1, 'Name is required'),
  url: httpUrlStringSchema,
  redirectType: z.enum(['301', '307', 'umr', 'fluxify']),
  categoryId: z.string().optional(),
  numberOfActions: z.coerce.number().min(1).max(64).optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  /** Matches {@link OfferParams} when `pageType === 'offer'`. */
  offerParams: z.object({
    idOfferSource: z.string(),
    payout: z.coerce.number().min(0),
    payoutType: z.enum(['perConversion', 'revShare']).optional(),
  }).optional(),
  fluxifyParams: fluxifyParamsSchema.optional(),
  isArchived: z.boolean().optional(),
  /** Wire format uses `-|` between values; see {@link Page.customFields}. */
  customFields: z.string().optional(),
})

export type PageFormData = z.infer<typeof pageSchema>
