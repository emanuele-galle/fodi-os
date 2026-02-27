'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MoreVertical, Pencil, Copy, Archive, Trash2 } from 'lucide-react'
import { type Project } from './types'

interface ProjectActionMenuProps {
  project: Project
  onDuplicate: (projectId: string) => void
  onArchive: (projectId: string) => void
  onDelete: (projectId: string) => void
}

export function ProjectActionMenu({ project, onDuplicate, onArchive, onDelete }: ProjectActionMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        aria-label="Azioni progetto"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); router.push(`/projects/${project.id}`) }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            Modifica
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDuplicate(project.id) }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplica
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onArchive(project.id) }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            Archivia
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(project.id) }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </button>
        </div>
      )}
    </div>
  )
}
