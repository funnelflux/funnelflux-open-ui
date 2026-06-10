/**
 * Converts between OpenAPI `FunnelCondition` (wire format) and the form model
 * validated by `conditionSchema` (blocks / rules for the React editor).
 */
import type { ConditionFormValues } from '@/schemas/condition'
import type { ConditionBlock, ConditionRule } from '@/types/funnel'
import type {
  FunnelCondition,
  FunnelConditionTest,
  FunnelConditionTestsBlock,
} from '@/types/entities'
import { generateEntityId } from '@/lib/id-generator'
import {
  API_OPERATOR_TO_UI,
  API_TEST_TO_CONDITION_FIELD,
  CONDITION_FIELD_TO_API_TEST,
  CONDITION_TOKEN_SEPARATOR,
  UI_OPERATOR_TO_API,
  type WireConditionTest,
} from '@/lib/funnelConditionMaps'

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
    const rawValues = Array.isArray(rule.value) ? rule.value.map(String) : [String(rule.value ?? '')]
    const compareVals = rawValues.map(String).filter((v) => v !== '')
    if (compareVals.length === 0 && op !== 'IS NOT') {
      throw new Error('Value is required for this rule.')
    }
    // Runtime `Condition` stores AND_VALUE = value(s) to match, AND_VALUE_2 = tracking field id.
    // API wire uses `testAgainstGenericParams.values` as [compareTokens..., fieldId] where multiple
    // tokens are merged with CONDITION_TOKEN_SEPARATOR inside slot 0 when saving (see PHP case).
    const comparePart =
      compareVals.length === 0 ? '' : compareVals.length === 1 ? compareVals[0]! : compareVals.join(CONDITION_TOKEN_SEPARATOR)
    return asFunnelConditionTest('Tracking Field', {
      operator: op,
      testAgainstGenericParams: {
        values: [comparePart, trackingField],
      },
    })
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

  // Tracking field: OpenAPI may include testAgainstTrackingFieldParams; DB/API round-trip uses
  // testAgainstGenericParams [compare, fieldId] matching `Condition::AND_VALUE` / `AND_VALUE_2`.
  // Older UI sent [fieldId, compare] then PHP imploded both into AND_VALUE only — recover via split.
  if (test.test === 'Tracking Field') {
    const tfParams = test.testAgainstTrackingFieldParams
    if (tfParams) {
      const trackingField = String(tfParams.trackingField ?? '').trim()
      const values = tfParams.values ?? []
      return {
        field: 'queryParam',
        operator,
        extraKey: trackingField,
        value: values.length <= 1 ? (values[0] ?? '') : values,
      }
    }
    const rawGeneric = test.testAgainstGenericParams?.values
    if (rawGeneric && rawGeneric.length > 0) {
      let genericVals = rawGeneric.filter((v) => v !== null && v !== undefined).map((v) => String(v))
      // PHP `fromConditionBlock` may produce [merged AND_VALUE, ""] when AND_VALUE_2 was missing.
      if (genericVals.length >= 2 && genericVals[genericVals.length - 1]!.trim() === '') {
        genericVals = [genericVals[0]!]
      }
      if (genericVals.length >= 2) {
        const first = genericVals[0]!.trim()
        const second = genericVals[1]!.trim()
        const firstLooksLikeFieldId = /^\d+$/.test(first)
        const secondLooksLikeFieldId = /^\d+$/.test(second)
        // Wrong order from an earlier Open UI save: [fieldId, compare, ...]
        if (firstLooksLikeFieldId && !secondLooksLikeFieldId) {
          const compareJoined = genericVals.slice(1).join(CONDITION_TOKEN_SEPARATOR)
          return {
            field: 'queryParam',
            operator,
            extraKey: first,
            value: compareJoined,
          }
        }
        const fieldId = genericVals[genericVals.length - 1]!.trim()
        const compareJoined = genericVals.slice(0, -1).join(CONDITION_TOKEN_SEPARATOR)
        return {
          field: 'queryParam',
          operator,
          extraKey: fieldId,
          value: compareJoined,
        }
      }
      if (genericVals.length === 1) {
        const parts = genericVals[0]!.split(CONDITION_TOKEN_SEPARATOR)
        if (parts.length >= 2) {
          const head = parts[0]!.trim()
          const rest = parts.slice(1).join(CONDITION_TOKEN_SEPARATOR)
          const headLooksLikeFieldId = /^\d+$/.test(head)
          if (headLooksLikeFieldId) {
            return {
              field: 'queryParam',
              operator,
              extraKey: head,
              value: rest,
            }
          }
        }
      }
    }
    return null
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
