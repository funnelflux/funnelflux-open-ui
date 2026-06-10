import type { FilterType } from '@/types/entities'

export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  ipAddresses: 'IP Addresses',
  ipRanges: 'IP Ranges',
  referrers: 'Referrers',
  userAgents: 'User Agents',
  ISPs: 'ISPs',
  countries: 'Countries',
  knownBotsAndSpiders: 'Known Bots & Spiders',
}

export const FILTER_TYPES = Object.keys(FILTER_TYPE_LABELS) as FilterType[]
