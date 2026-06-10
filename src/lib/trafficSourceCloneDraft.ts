import { defaultClonedEntityName } from '@/lib/cloneDraftName'
import { generateEntityId } from '@/lib/id-generator'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import type { TrafficSource } from '@/types/entities'

export function defaultClonedTrafficSourceName(sourceName: string): string {
  return defaultClonedEntityName(sourceName, 'New traffic source (copy)')
}

/** Form values for create-after-clone (new id; user saves to persist). */
export function buildTrafficSourceCloneDraft(source: TrafficSource): TrafficSourceFormData {
  return {
    idTrafficSource: generateEntityId(),
    trafficSourceName: defaultClonedTrafficSourceName(source.trafficSourceName),
    costType: source.costType ?? 'cpe',
    defaultCost: source.defaultCost != null ? String(source.defaultCost) : '',
    trackingFields: (source.trackingFields ?? []).map((field) => ({
      key: field.key,
      value: field.value,
    })),
    postback: {
      postbackType: source.postback?.postbackType ?? 'none',
      postbackCode: source.postback?.postbackCode ?? '',
    },
    idCategory: source.idCategory ?? '',
    isArchived: false,
  }
}
