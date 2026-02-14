export interface WizardCondition {
  fieldId: string
  operator: string
  value: string | number | boolean
}

export function evaluateCondition(
  condition: WizardCondition | null | undefined,
  answers: Record<string, unknown>
): boolean {
  if (!condition) return true
  const { fieldId, operator, value } = condition
  const fieldValue = answers[fieldId]

  switch (operator) {
    case 'eq':
      return String(fieldValue) === String(value)
    case 'neq':
      return String(fieldValue) !== String(value)
    case 'gt':
      return Number(fieldValue) > Number(value)
    case 'lt':
      return Number(fieldValue) < Number(value)
    case 'gte':
      return Number(fieldValue) >= Number(value)
    case 'lte':
      return Number(fieldValue) <= Number(value)
    case 'contains':
      return String(fieldValue ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'notContains':
      return !String(fieldValue ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === ''
    case 'notEmpty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
    default:
      return true
  }
}
