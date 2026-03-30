import { z } from 'zod'

export const conditionRuleSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: z.string().min(1, 'Operator is required'),
  value: z.union([z.string(), z.array(z.string())]).default(''),
  extraKey: z.string().optional(),
})

export const conditionBlockSchema = z.object({
  logicOperator: z.enum(['AND', 'OR']).default('AND'),
  rules: z.array(conditionRuleSchema).min(1, 'At least one rule is required'),
})

export const conditionSchema = z.object({
  idCondition: z.string().optional(),
  conditionName: z.string().min(1, 'Condition name is required').max(255),
  scope: z.enum(['global', 'funnel']).default('global'),
  blocks: z.array(conditionBlockSchema).min(1, 'At least one block is required'),
  blockLogicOperator: z.enum(['AND', 'OR']).default('AND'),
})

export type ConditionRuleFormValues = z.infer<typeof conditionRuleSchema>
export type ConditionBlockFormValues = z.infer<typeof conditionBlockSchema>
export type ConditionFormValues = z.infer<typeof conditionSchema>
