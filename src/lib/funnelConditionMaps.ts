import type { ConditionField, ConditionOperator } from '@/types/funnel'
import type { FunnelConditionTest } from '@/types/entities'

/** Same as `\Condition::SEPARATOR` — used to join multiple comparison tokens for one test. */
export const CONDITION_TOKEN_SEPARATOR = ',,'

/** Labels the PHP API uses that are missing from the generated OpenAPI string union. */
export type WireConditionTestExtra = 'Visitor Tag(s)' | 'Connection: Type'
export type WireConditionTest = FunnelConditionTest['test'] | WireConditionTestExtra

export const UI_OPERATOR_TO_API: Partial<Record<ConditionOperator, FunnelConditionTest['operator']>> = {
  equals: 'IS',
  notEquals: 'IS NOT',
  greaterThan: '>',
  lessThan: '<',
  in: 'IS',
  notIn: 'IS NOT',
}

export const API_OPERATOR_TO_UI: Partial<Record<FunnelConditionTest['operator'], ConditionOperator>> = {
  IS: 'equals',
  'IS NOT': 'notEquals',
  '>': 'greaterThan',
  '<': 'lessThan',
  '>=': 'greaterThan',
  '<=': 'lessThan',
}

/** Maps editor field -> API `test` label (generic / tracking / visitor-tag tests). */
export const CONDITION_FIELD_TO_API_TEST: Partial<Record<ConditionField, WireConditionTest>> = {
  country: 'Location: Country',
  region: 'Location: Region',
  city: 'Location: City',
  language: 'Device: Browser Language',
  isp: 'Connection: ISP',
  ip: 'Connection: IP',
  deviceType: 'Device: Type',
  os: 'Device: OS',
  osVersion: 'Device: OS Version',
  browser: 'Device: Browser',
  browserVersion: 'Device: Browser Version',
  brand: 'Device: Brand',
  model: 'Device: Model',
  connectionType: 'Connection: Type',
  referrer: 'Connection: Referrer',
  referrerDomain: 'Connection: Referrer',
  userAgent: 'Connection: User Agent',
  dayOfWeek: 'Time: Day of Week',
  hourOfDay: 'Time: Time of Day',
  visitorTag: 'Visitor Tag(s)',
  queryParam: 'Tracking Field',
  customField: 'Tracking Field',
}

/** Inverse of generic test labels -> editor fields (one API test maps to one field). */
export const API_TEST_TO_CONDITION_FIELD: Partial<Record<WireConditionTest, ConditionField>> = {
  'Location: Country': 'country',
  'Location: Region': 'region',
  'Location: City': 'city',
  'Device: Browser Language': 'language',
  'Connection: ISP': 'isp',
  'Connection: IP': 'ip',
  'Device: Type': 'deviceType',
  'Device: OS': 'os',
  'Device: OS Version': 'osVersion',
  'Device: Browser': 'browser',
  'Device: Browser Version': 'browserVersion',
  'Device: Brand': 'brand',
  'Device: Model': 'model',
  'Connection: Type': 'connectionType',
  'Connection: Referrer': 'referrer',
  'Connection: User Agent': 'userAgent',
  'Visitor Tag(s)': 'visitorTag',
  'Time: Day of Week': 'dayOfWeek',
  'Time: Time of Day': 'hourOfDay',
  'Tracking Field': 'queryParam',
}
