import type { TrafficSourceFormData } from '@/schemas/trafficSource'

/**
 * Shape returned by GET /data/trafficsource/template/load/?name=...
 * (parsed .ini template — not the same as TrafficSource entity JSON).
 */
export interface TrafficSourceTemplateLoadResponse {
  identification?: {
    name?: string
    category?: string | null
    /** Legacy TrafficSource::COST_TYPE_* — "0" = CPE, "1" = CPA */
    typecost?: string
    defaultcost?: string
  }
  trackingFields?: Array<{ fieldName: string; token: string }>
  /** Keys from [postback] section — typically `type`, `code` */
  postback?: Record<string, string | undefined>
}

/** Maps TrafficSource::POSTBACK_TYPE_* int as string → V2 postbackType. */
const LEGACY_POSTBACK_TYPE_TO_FORM: Record<
  string,
  TrafficSourceFormData['postback']['postbackType']
> = {
  '0': 'none',
  '1': 'postbackUrl',
  '2': 'pixelUrl',
  '3': 'javascript',
}

function firstString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v) !== '') return String(v)
  }
  return ''
}

export function mapTrafficSourceTemplateLoadToFormPatch(
  raw: TrafficSourceTemplateLoadResponse,
): Pick<
  TrafficSourceFormData,
  'trafficSourceName' | 'costType' | 'defaultCost' | 'trackingFields' | 'postback'
> {
  const id = (raw.identification ?? {}) as Record<string, unknown>
  const typeKey = String(
    firstString((raw.postback ?? {}) as Record<string, unknown>, ['type', 'Type']) || '0',
  ).trim()
  const typecost = firstString(id, ['typecost', 'typeCost', 'TypeCost'])
  return {
    trafficSourceName: firstString(id, ['name', 'Name']),
    costType: typecost === '1' ? 'cpa' : 'cpe',
    defaultCost: firstString(id, ['defaultcost', 'defaultCost', 'DefaultCost']),
    trackingFields: (raw.trackingFields ?? []).map((row) => ({
      key: row.fieldName,
      value: row.token,
    })),
    postback: {
      postbackType: LEGACY_POSTBACK_TYPE_TO_FORM[typeKey] ?? 'none',
      postbackCode: firstString((raw.postback ?? {}) as Record<string, unknown>, ['code', 'Code']),
    },
  }
}
