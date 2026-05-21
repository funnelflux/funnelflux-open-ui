import { generateEntityId } from '@/lib/id-generator'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import type { TrafficSource } from '@/types/entities'

const NAME_MAX = 255
const COPY_SUFFIX = ' (copy)'

export function defaultClonedTrafficSourceName(sourceName: string): string {
  const trimmed = sourceName.trim()
  if (!trimmed) return 'New traffic source (copy)'
  if (trimmed.length + COPY_SUFFIX.length <= NAME_MAX) return `${trimmed}${COPY_SUFFIX}`
  return `${trimmed.slice(0, NAME_MAX - COPY_SUFFIX.length)}${COPY_SUFFIX}`
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
