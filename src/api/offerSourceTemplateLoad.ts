import type { OfferSourceFormData } from '@/schemas/offerSource'

/**
 * Shape returned by GET /data/offersource/template/load/?name=...
 * (parsed .ini template — not the same as OfferSource entity JSON).
 */
export interface OfferSourceTemplateLoadResponse {
  identification?: Record<string, string | number | undefined | null>
}

function firstString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v) !== '') return String(v)
  }
  return ''
}

export function mapOfferSourceTemplateLoadToFormPatch(
  raw: OfferSourceTemplateLoadResponse,
): Pick<
  OfferSourceFormData,
  'offerSourceName' | 'subId' | 'querySeparator' | 'postbackSubId' | 'postbackTxId' | 'postbackPayout'
> {
  const id = (raw.identification ?? {}) as Record<string, unknown>
  const sep = firstString(id, ['url_query_separator', 'urlQuerySeparator'])
  return {
    offerSourceName: firstString(id, ['name', 'Name', 'offerSourceName']),
    subId: firstString(id, ['subid', 'subId']),
    querySeparator: sep !== '' ? sep : '&',
    postbackSubId: firstString(id, ['postback_subid', 'postbackSubId']),
    postbackTxId: firstString(id, ['postback_txid', 'postbackTxId']),
    postbackPayout: firstString(id, ['postback_payout', 'postbackPayout']),
  }
}
