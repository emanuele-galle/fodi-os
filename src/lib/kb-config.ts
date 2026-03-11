import {
  Library, BookOpen, Cog, GraduationCap, HelpCircle,
  type LucideIcon,
} from 'lucide-react'

export interface KbCategoryMeta {
  value: string
  label: string
  icon: LucideIcon
  color: string
}

export const KB_CATEGORIES: KbCategoryMeta[] = [
  { value: 'general', label: 'Generale', icon: Library, color: '#6366f1' },
  { value: 'procedure', label: 'Procedure', icon: BookOpen, color: '#10b981' },
  { value: 'technical', label: 'Tecnico', icon: Cog, color: '#06b6d4' },
  { value: 'onboarding', label: 'Onboarding', icon: GraduationCap, color: '#f59e0b' },
  { value: 'faq', label: 'FAQ', icon: HelpCircle, color: '#8b5cf6' },
]

export function getCategoryMeta(value: string): KbCategoryMeta {
  return KB_CATEGORIES.find(c => c.value === value) ?? KB_CATEGORIES[0]
}
