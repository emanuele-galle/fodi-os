import { describe, it, expect } from 'vitest'
import { evaluateCondition } from '@/lib/wizard-conditions'
import type { WizardCondition } from '@/lib/wizard-conditions'

describe('Wizard Conditions - evaluateCondition', () => {
  describe('null/undefined condition', () => {
    it('returns true for null condition', () => {
      expect(evaluateCondition(null, {})).toBe(true)
    })

    it('returns true for undefined condition', () => {
      expect(evaluateCondition(undefined, {})).toBe(true)
    })
  })

  describe('eq operator', () => {
    it('matches equal string values', () => {
      const condition: WizardCondition = { fieldId: 'color', operator: 'eq', value: 'red' }
      expect(evaluateCondition(condition, { color: 'red' })).toBe(true)
    })

    it('does not match different string values', () => {
      const condition: WizardCondition = { fieldId: 'color', operator: 'eq', value: 'red' }
      expect(evaluateCondition(condition, { color: 'blue' })).toBe(false)
    })

    it('compares as strings (number coercion)', () => {
      const condition: WizardCondition = { fieldId: 'count', operator: 'eq', value: '5' }
      expect(evaluateCondition(condition, { count: 5 })).toBe(true)
    })
  })

  describe('neq operator', () => {
    it('returns true for different values', () => {
      const condition: WizardCondition = { fieldId: 'status', operator: 'neq', value: 'done' }
      expect(evaluateCondition(condition, { status: 'pending' })).toBe(true)
    })

    it('returns false for equal values', () => {
      const condition: WizardCondition = { fieldId: 'status', operator: 'neq', value: 'done' }
      expect(evaluateCondition(condition, { status: 'done' })).toBe(false)
    })
  })

  describe('numeric comparisons', () => {
    it('gt: true when field > value', () => {
      const condition: WizardCondition = { fieldId: 'age', operator: 'gt', value: 18 }
      expect(evaluateCondition(condition, { age: 25 })).toBe(true)
    })

    it('gt: false when field <= value', () => {
      const condition: WizardCondition = { fieldId: 'age', operator: 'gt', value: 18 }
      expect(evaluateCondition(condition, { age: 18 })).toBe(false)
    })

    it('lt: true when field < value', () => {
      const condition: WizardCondition = { fieldId: 'price', operator: 'lt', value: 100 }
      expect(evaluateCondition(condition, { price: 50 })).toBe(true)
    })

    it('lt: false when field >= value', () => {
      const condition: WizardCondition = { fieldId: 'price', operator: 'lt', value: 100 }
      expect(evaluateCondition(condition, { price: 100 })).toBe(false)
    })

    it('gte: true when field >= value', () => {
      const condition: WizardCondition = { fieldId: 'qty', operator: 'gte', value: 10 }
      expect(evaluateCondition(condition, { qty: 10 })).toBe(true)
      expect(evaluateCondition(condition, { qty: 15 })).toBe(true)
    })

    it('gte: false when field < value', () => {
      const condition: WizardCondition = { fieldId: 'qty', operator: 'gte', value: 10 }
      expect(evaluateCondition(condition, { qty: 9 })).toBe(false)
    })

    it('lte: true when field <= value', () => {
      const condition: WizardCondition = { fieldId: 'qty', operator: 'lte', value: 10 }
      expect(evaluateCondition(condition, { qty: 10 })).toBe(true)
      expect(evaluateCondition(condition, { qty: 5 })).toBe(true)
    })

    it('lte: false when field > value', () => {
      const condition: WizardCondition = { fieldId: 'qty', operator: 'lte', value: 10 }
      expect(evaluateCondition(condition, { qty: 11 })).toBe(false)
    })
  })

  describe('contains / notContains', () => {
    it('contains: true when field includes substring (case-insensitive)', () => {
      const condition: WizardCondition = { fieldId: 'name', operator: 'contains', value: 'mario' }
      expect(evaluateCondition(condition, { name: 'Super Mario Bros' })).toBe(true)
    })

    it('contains: false when field does not include substring', () => {
      const condition: WizardCondition = { fieldId: 'name', operator: 'contains', value: 'luigi' }
      expect(evaluateCondition(condition, { name: 'Super Mario Bros' })).toBe(false)
    })

    it('contains: handles undefined field value', () => {
      const condition: WizardCondition = { fieldId: 'missing', operator: 'contains', value: 'test' }
      expect(evaluateCondition(condition, {})).toBe(false)
    })

    it('notContains: true when field does not include substring', () => {
      const condition: WizardCondition = { fieldId: 'name', operator: 'notContains', value: 'luigi' }
      expect(evaluateCondition(condition, { name: 'Super Mario Bros' })).toBe(true)
    })

    it('notContains: false when field includes substring', () => {
      const condition: WizardCondition = { fieldId: 'name', operator: 'notContains', value: 'mario' }
      expect(evaluateCondition(condition, { name: 'Super Mario Bros' })).toBe(false)
    })
  })

  describe('empty / notEmpty', () => {
    it('empty: true for undefined field', () => {
      const condition: WizardCondition = { fieldId: 'missing', operator: 'empty', value: true }
      expect(evaluateCondition(condition, {})).toBe(true)
    })

    it('empty: true for null field', () => {
      const condition: WizardCondition = { fieldId: 'field', operator: 'empty', value: true }
      expect(evaluateCondition(condition, { field: null })).toBe(true)
    })

    it('empty: true for empty string', () => {
      const condition: WizardCondition = { fieldId: 'field', operator: 'empty', value: true }
      expect(evaluateCondition(condition, { field: '' })).toBe(true)
    })

    it('empty: false for non-empty value', () => {
      const condition: WizardCondition = { fieldId: 'field', operator: 'empty', value: true }
      expect(evaluateCondition(condition, { field: 'hello' })).toBe(false)
    })

    it('notEmpty: true for non-empty value', () => {
      const condition: WizardCondition = { fieldId: 'field', operator: 'notEmpty', value: true }
      expect(evaluateCondition(condition, { field: 'hello' })).toBe(true)
    })

    it('notEmpty: false for undefined', () => {
      const condition: WizardCondition = { fieldId: 'missing', operator: 'notEmpty', value: true }
      expect(evaluateCondition(condition, {})).toBe(false)
    })
  })

  describe('unknown operator', () => {
    it('returns true for unknown operator', () => {
      const condition: WizardCondition = { fieldId: 'x', operator: 'unknown_op', value: 'y' }
      expect(evaluateCondition(condition, { x: 'y' })).toBe(true)
    })
  })
})
