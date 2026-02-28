import { readFileSync } from 'fs'
import { join } from 'path'

const SKILLS_DIR = join(process.cwd(), 'src/lib/ai/prompts/skills')

const SKILL_FILES = [
  'calendar.md',
  'chat.md',
  'coordination.md',
  'crm.md',
  'erp.md',
  'notifications.md',
  'reports.md',
  'support.md',
  'tasks.md',
  'time.md',
]

function loadSkill(filename: string): string {
  try {
    return readFileSync(join(SKILLS_DIR, filename), 'utf-8')
  } catch {
    return ''
  }
}

let _cachedPrompts: string | null = null

export function getAllSkillPrompts(): string {
  if (_cachedPrompts !== null) return _cachedPrompts

  _cachedPrompts = SKILL_FILES
    .map(loadSkill)
    .filter(Boolean)
    .map(content => `\n${content}`)
    .join('\n')

  return _cachedPrompts
}
