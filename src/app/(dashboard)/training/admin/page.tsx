'use client'

import { useRouter } from 'next/navigation'
import { BarChart3, BookOpen, FolderOpen, Shield, Users } from 'lucide-react'

const adminSections = [
  { href: '/training/admin/categories', icon: FolderOpen, label: 'Categorie', description: 'Gestisci categorie di formazione' },
  { href: '/training/admin/courses/new', icon: BookOpen, label: 'Nuovo Corso', description: 'Crea un nuovo corso di formazione' },
  { href: '/training/admin/analytics', icon: BarChart3, label: 'Analytics', description: 'Statistiche e report formazione' },
  { href: '/training/admin/analytics/users', icon: Users, label: 'Progresso Utenti', description: 'Monitoraggio avanzamento utenti' },
  { href: '/training/admin/security', icon: Shield, label: 'Log Sicurezza', description: 'Monitoraggio eventi sicurezza' },
]

export default function TrainingAdminPage() {
  const router = useRouter()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestione Formazione</h1>
        <p className="text-muted mt-1">Amministra corsi, categorie, e monitora il progresso degli utenti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminSections.map(section => (
          <button
            key={section.href}
            onClick={() => router.push(section.href)}
            className="card-elevated p-6 text-left hover:border-primary/30 transition-colors group"
          >
            <section.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold">{section.label}</h3>
            <p className="text-sm text-muted mt-1">{section.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
