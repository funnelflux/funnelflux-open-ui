/**
 * Converts between OpenAPI `FunnelCondition` (wire format) and the form model
 * validated by `conditionSchema` (blocks / rules for the React editor).
 */
import type { ConditionFormValues } from '@/schemas/condition'
import type { ConditionBlock, ConditionField, ConditionOperator, ConditionRule } from '@/types/funnel'
import type {
  FunnelCondition,
  FunnelConditionTest,
  FunnelConditionTestsBlock,
} from '@/types/entities'
import { generateEntityId } from '@/lib/id-generator'

/** Labels the PHP API uses that are missing from the generated OpenAPI string union. */
type WireConditionTestExtra = 'Visitor Tag(s)' | 'Connection: Type'
type WireConditionTest = FunnelConditionTest['test'] | WireConditionTestExtra

const UI_OPERATOR_TO_API: Partial<Record<ConditionOperator, FunnelConditionTest['operator']>> = {
  equals: 'IS',
  notEquals: 'IS NOT',
  greaterThan: '>',
  lessThan: '<',
  in: 'IS',
  notIn: 'IS NOT',
}

const API_OPERATOR_TO_UI: Partial<Record<FunnelConditionTest['operator'], ConditionOperator>> = {
  IS: 'equals',
  'IS NOT': 'notEquals',
  '>': 'greaterThan',
  '<': 'lessThan',
  '>=': 'greaterThan',
  '<=': 'lessThan',
}

/** Maps editor field → API `test` label (generic / tracking / visitor-tag tests). */
const CONDITION_FIELD_TO_API_TEST: Partial<Record<ConditionField, WireConditionTest>> = {
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

/** Inverse of generic test labels → editor fields (one API test maps to one field). */
const API_TEST_TO_CONDITION_FIELD: Partial<Record<WireConditionTest, ConditionField>> = {
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

function createEmptyRule(): ConditionRule {
  return { field: 'country', operator: 'equals', value: '' }
}

function createEmptyBlock(): ConditionBlock {
  return { logicOperator: 'AND', rules: [createEmptyRule()] }
}

function asFunnelConditionTest(test: WireConditionTest, base: Omit<FunnelConditionTest, 'test'>): FunnelConditionTest {
  return { ...base, test: test as FunnelConditionTest['test'] }
}

function uiRuleToApiTest(rule: ConditionRule): FunnelConditionTest {
  const op = UI_OPERATOR_TO_API[rule.operator]
  if (!op) {
    throw new Error(`Operator "${rule.operator}" is not supported for API save. Use equals, not equals, >, <, in, or not in.`)
  }

  if (rule.field === 'visitorTag') {
    const key = String(rule.extraKey ?? '').trim()
    if (!key) throw new Error('Visitor tag key is required.')
    const values = Array.isArray(rule.value) ? rule.value.map(String) : [String(rule.value ?? '')]
    return asFunnelConditionTest('Visitor Tag(s)', {
      operator: op,
      testAgainstGenericParams: { values: [key, ...values.filter(Boolean)] },
    })
  }

  if (rule.field === 'queryParam' || rule.field === 'customField') {
    const trackingField = String(rule.extraKey ?? '').trim()
    if (!trackingField) throw new Error('Tracking / custom field name is required.')
    const values = Array.isArray(rule.value) ? rule.value.map(String) : [String(rule.value ?? '')]
    return {
      test: 'Tracking Field',
      operator: op,
      testAgainstTrackingFieldParams: { trackingField, values: values.filter(Boolean) },
    }
  }

  const testLabel = CONDITION_FIELD_TO_API_TEST[rule.field]
  if (!testLabel) {
    throw new Error(`Field "${rule.field}" cannot be sent to the API yet.`)
  }
  const test = testLabel

  const rawValues = Array.isArray(rule.value) ? rule.value : [String(rule.value ?? '')]
  const values = rawValues.map(String).filter((v) => v !== '')

  if (test === 'Time: Day of Week') {
    const dayNum = Number(values[0] ?? '')
    if (!Number.isFinite(dayNum)) throw new Error('Day of week must be a number (0–6).')
    const week = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as const
    const day = week[Math.min(Math.max(dayNum, 0), 6)]
    return asFunnelConditionTest(test, {
      operator: op,
      testAgainstTimeDayOfWeekParams: { day },
    })
  }

  if (test === 'Time: Time of Day') {
    const hour = Number(values[0] ?? '')
    const minutes = values.length > 1 ? Number(values[1]) : 0
    if (!Number.isFinite(hour) || !Number.isFinite(minutes)) {
      throw new Error('Time of day requires a valid hour (0–23); optional minutes as second value.')
    }
    return asFunnelConditionTest(test, {
      operator: op,
      testAgainstTimeOfDayParams: { time: { hour, minutes } },
    })
  }

  if (values.length === 0 && op !== 'IS NOT') {
    throw new Error('Value is required for this rule.')
  }

  return asFunnelConditionTest(test, {
    operator: op,
    testAgainstGenericParams: { values: values.length > 0 ? values : [''] },
  })
}

function apiTestToRule(test: FunnelConditionTest): ConditionRule | null {
  const operator = API_OPERATOR_TO_UI[test.operator] ?? 'equals'
  const testName = test.test as WireConditionTest

  if (test.test === 'Tracking Field' && test.testAgainstTrackingFieldParams) {
    const { trackingField, values } = test.testAgainstTrackingFieldParams
    return {
      field: 'queryParam',
      operator,
      extraKey: trackingField,
      value: values.length <= 1 ? (values[0] ?? '') : values,
    }
  }

  if (testName === 'Visitor Tag(s)' && test.testAgainstGenericParams?.values?.length) {
    const [first, ...rest] = test.testAgainstGenericParams.values
    return {
      field: 'visitorTag',
      operator,
      extraKey: first,
      value: rest.length <= 1 ? (rest[0] ?? '') : rest,
    }
  }

  if (test.test === 'Time: Day of Week' && test.testAgainstTimeDayOfWeekParams) {
    const order = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as const
    const day = test.testAgainstTimeDayOfWeekParams.day
    const idx = order.indexOf(day)
    return { field: 'dayOfWeek', operator, value: String(idx >= 0 ? idx : 0) }
  }

  if (test.test === 'Time: Time of Day' && test.testAgainstTimeOfDayParams) {
    const { hour } = test.testAgainstTimeOfDayParams.time
    return { field: 'hourOfDay', operator, value: String(hour) }
  }

  const field = API_TEST_TO_CONDITION_FIELD[testName]
  if (!field || !test.testAgainstGenericParams) return null

  const values = test.testAgainstGenericParams.values
  const value = values.length <= 1 ? (values[0] ?? '') : values

  return { field, operator, value }
}

function blocksFromOrTests(orTests: FunnelConditionTestsBlock[]): ConditionBlock[] {
  return orTests.map((block) => {
    const rules = block.andTests.map(apiTestToRule).filter((r): r is ConditionRule => r !== null)
    return {
      logicOperator: 'AND',
      rules: rules.length > 0 ? rules : [createEmptyRule()],
    }
  })
}

export function funnelConditionToFormDraft(condition: FunnelCondition): ConditionFormValues {
  const orTests = condition.orTests ?? []
  const blocks =
    orTests.length > 0 ? blocksFromOrTests(orTests) : [createEmptyBlock()]

  return {
    idCondition: condition.idCondition,
    conditionName: condition.conditionName,
    scope: condition.restrictToFunnelId ? 'funnel' : 'global',
    blocks,
    blockLogicOperator: orTests.length > 1 ? 'OR' : 'AND',
  }
}

export function formDraftToFunnelCondition(
  draft: ConditionFormValues,
  previousWire?: FunnelCondition | null,
): FunnelCondition {
  for (const block of draft.blocks) {
    if (block.logicOperator === 'OR') {
      throw new Error('OR between rules inside a block is not supported for API save. Switch rules to AND or split into separate blocks.')
    }
  }

  let orTests: FunnelConditionTestsBlock[]

  if (draft.blockLogicOperator === 'OR') {
    orTests = draft.blocks.map((block) => ({
      andTests: block.rules.map((rule) => uiRuleToApiTest(rule as ConditionRule)),
    }))
  } else {
    const andTests = draft.blocks.flatMap((block) =>
      block.rules.map((rule) => uiRuleToApiTest(rule as ConditionRule)),
    )
    orTests = [{ andTests }]
  }

  const idCondition =
    draft.idCondition && draft.idCondition !== '' ? draft.idCondition : generateEntityId()

  const restrictToFunnelId =
    draft.scope === 'global'
      ? ''
      : (previousWire?.restrictToFunnelId ?? '')

  return {
    idCondition,
    conditionName: draft.conditionName,
    orTests,
    restrictToFunnelId,
  }
}
