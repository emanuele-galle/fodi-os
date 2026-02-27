export interface TaskUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  author: TaskUser
}

export interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; firstName: string; lastName: string }
}

export interface TaskAssignment {
  id: string
  role: string
  user: TaskUser
  assignedBy: string | null
  assignedByUser: TaskUser | null
  assignedAt: string
}

export interface Subtask {
  id: string
  title: string
  status: string
  priority: string
  assignee: TaskUser | null
  assignments?: { id: string; role: string; user: TaskUser }[]
}

export interface TaskDetail {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  boardColumn: string
  assigneeId: string | null
  assignee: TaskUser | null
  assignments?: TaskAssignment[]
  dueDate: string | null
  isPersonal: boolean
  folderId: string | null
  project: { id: string; name: string } | null
  comments: Comment[]
  tags: string[]
  timerStartedAt: string | null
  timerUserId: string | null
  subtasks?: Subtask[]
  _count?: { subtasks: number }
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

export interface ActivityLogEntry {
  id: string
  action: string
  metadata: {
    title?: string
    changedFields?: string
    changes?: Array<{ field: string; from: unknown; to: unknown }>
  } | null
  createdAt: string
  user: TaskUser
}

export const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Da fare' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'IN_REVIEW', label: 'In Revisione' },
  { value: 'DONE', label: 'Completato' },
  { value: 'CANCELLED', label: 'Cancellato' },
]

export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
