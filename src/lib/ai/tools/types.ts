import type { Role } from '@/generated/prisma/client'
import type { Module, Permission } from '@/lib/permissions'

export interface AiToolInput {
  [key: string]: unknown
}

export interface AiToolContext {
  userId: string
  role: Role
  customModulePermissions?: Record<string, string[]> | null
}

export interface AiToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface AiToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  module: Module
  requiredPermission: Permission
  execute: (input: AiToolInput, context: AiToolContext) => Promise<AiToolResult>
}
