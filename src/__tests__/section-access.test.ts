import { describe, it, expect } from 'vitest'
import {
  getDefaultSectionAccess,
  getEffectiveSectionAccess,
  SECTIONS,
} from '@/lib/section-access'
import type { SectionAccessMap, Section } from '@/lib/section-access'


describe('Section Access - getDefaultSectionAccess', () => {
  it('ADMIN can view and edit all sections', () => {
    const access = getDefaultSectionAccess('ADMIN')
    for (const section of SECTIONS) {
      expect(access[section].view).toBe(true)
      expect(access[section].edit).toBe(true)
    }
  })

  it('CLIENT can only view limited sections', () => {
    const access = getDefaultSectionAccess('CLIENT')
    const clientSections: Section[] = ['dashboard', 'tasks', 'chat', 'calendar', 'team', 'settings']
    const deniedSections: Section[] = ['internal', 'crm', 'projects', 'erp', 'support']

    for (const section of clientSections) {
      expect(access[section].view).toBe(true)
    }
    for (const section of deniedSections) {
      expect(access[section].view).toBe(false)
    }
  })

  it('CLIENT cannot edit any section', () => {
    const access = getDefaultSectionAccess('CLIENT')
    for (const section of SECTIONS) {
      expect(access[section].edit).toBe(false)
    }
  })

  it('DIR_COMMERCIALE has edit on crm and erp', () => {
    const access = getDefaultSectionAccess('DIR_COMMERCIALE')
    expect(access.crm.edit).toBe(true)
    expect(access.erp.edit).toBe(true)
    expect(access.support.edit).toBe(false)
    expect(access.projects.edit).toBe(false)
  })

  it('DIR_TECNICO has edit on projects', () => {
    const access = getDefaultSectionAccess('DIR_TECNICO')
    expect(access.projects.edit).toBe(true)
    expect(access.crm.edit).toBe(false)
  })

  it('DIR_SUPPORT has edit on support and crm', () => {
    const access = getDefaultSectionAccess('DIR_SUPPORT')
    expect(access.support.edit).toBe(true)
    expect(access.crm.edit).toBe(true)
    expect(access.erp.edit).toBe(false)
  })

  it('DEVELOPER cannot view crm or erp', () => {
    const access = getDefaultSectionAccess('DEVELOPER')
    expect(access.crm.view).toBe(false)
    expect(access.erp.view).toBe(false)
    expect(access.projects.view).toBe(true)
    expect(access.tasks.view).toBe(true)
  })

  it('CONTENT cannot view crm, erp, or support', () => {
    const access = getDefaultSectionAccess('CONTENT')
    expect(access.crm.view).toBe(false)
    expect(access.erp.view).toBe(false)
    expect(access.support.view).toBe(false)
    expect(access.projects.view).toBe(true)
  })

  it('returns entries for all defined sections', () => {
    const access = getDefaultSectionAccess('ADMIN')
    for (const section of SECTIONS) {
      expect(access[section]).toBeDefined()
      expect(typeof access[section].view).toBe('boolean')
      expect(typeof access[section].edit).toBe('boolean')
    }
  })
})

describe('Section Access - getEffectiveSectionAccess', () => {
  it('returns defaults when no override provided', () => {
    const defaults = getDefaultSectionAccess('DEVELOPER')
    const effective = getEffectiveSectionAccess('DEVELOPER', null)
    expect(effective).toEqual(defaults)
  })

  it('returns defaults when override is undefined', () => {
    const defaults = getDefaultSectionAccess('ADMIN')
    const effective = getEffectiveSectionAccess('ADMIN', undefined)
    expect(effective).toEqual(defaults)
  })

  it('overrides specific sections', () => {
    const override: SectionAccessMap = {
      ...getDefaultSectionAccess('DEVELOPER'),
      crm: { view: true, edit: true },
    }
    const effective = getEffectiveSectionAccess('DEVELOPER', override)
    expect(effective.crm.view).toBe(true)
    expect(effective.crm.edit).toBe(true)
  })

  it('uses custom role section access as base when provided', () => {
    const customRoleAccess: SectionAccessMap = {} as SectionAccessMap
    for (const section of SECTIONS) {
      customRoleAccess[section] = { view: false, edit: false }
    }
    customRoleAccess.dashboard = { view: true, edit: false }
    customRoleAccess.chat = { view: true, edit: true }

    const effective = getEffectiveSectionAccess('COMMERCIALE', null, customRoleAccess)
    expect(effective.dashboard.view).toBe(true)
    expect(effective.chat.view).toBe(true)
    expect(effective.chat.edit).toBe(true)
    expect(effective.crm.view).toBe(false)
  })

  it('user-level overrides take priority over custom role', () => {
    const customRoleAccess: SectionAccessMap = {} as SectionAccessMap
    for (const section of SECTIONS) {
      customRoleAccess[section] = { view: false, edit: false }
    }

    const userOverride: SectionAccessMap = {} as SectionAccessMap
    for (const section of SECTIONS) {
      userOverride[section] = { view: false, edit: false }
    }
    userOverride.erp = { view: true, edit: true }

    const effective = getEffectiveSectionAccess('COMMERCIALE', userOverride, customRoleAccess)
    expect(effective.erp.view).toBe(true)
    expect(effective.erp.edit).toBe(true)
  })
})
