import type { Role } from '@/generated/prisma/client'
import { hasPermission } from '@/lib/permissions'
import type { AiToolDefinition } from './types'

import { taskTools } from './modules/tasks'
import { crmTools } from './modules/crm'
import { calendarTools } from './modules/calendar'
import { reportTools } from './modules/reports'
import { dailyTools } from './modules/daily'
import { erpTools } from './modules/erp'
import { supportTools } from './modules/support'
import { timeTools } from './modules/time'

const ALL_TOOLS: AiToolDefinition[] = [
  ...taskTools,
  ...crmTools,
  ...calendarTools,
  ...reportTools,
  ...dailyTools,
  ...erpTools,
  ...supportTools,
  ...timeTools,
]

/**
 * Returns tools available for a given user role, filtered by permissions.
 * Optionally filtered by enabledTools list from AiAgentConfig.
 */
export function getToolsForRole(
  role: Role,
  customModulePermissions?: Record<string, string[]> | null,
  enabledTools?: string[],
): AiToolDefinition[] {
  return ALL_TOOLS.filter((tool) => {
    // Check role permission
    if (!hasPermission(role, tool.module, tool.requiredPermission, customModulePermissions)) {
      return false
    }
    // Check enabled tools list (if configured, empty = all enabled)
    if (enabledTools && enabledTools.length > 0 && !enabledTools.includes(tool.name)) {
      return false
    }
    return true
  })
}

/**
 * Find a tool by name.
 */
export function findTool(name: string): AiToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name)
}

/**
 * Convert tools to Anthropic API tool format.
 */
export function toAnthropicTools(tools: AiToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }))
}
