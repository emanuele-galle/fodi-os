'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Library, Plus, Search, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'

interface WikiPage {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string
  tags: string[]
  isPublished: boolean
  updatedAt: string
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tutte le categorie' },
  { value: 'general', label: 'Generale' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'technical', label: 'Tecnico' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'faq', label: 'FAQ' },
]

export default function KbPage() {
  const router = useRouter()
  const [pages, setPages] = useState<WikiPage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [userRole, setUserRole] = useState('')
  const limit = 20

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => { if (data.user) setUserRole(data.user.role) })
      .catch(() => {})
  }, [])

  const fetchPages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      const res = await fetch(`/api/kb?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPages(data.items || [])
        setTotal(data.total || 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, search, category])

  useEffect(() => { fetchPages() }, [fetchPages])
  useEffect(() => { setPage(1) }, [search, category])

  const totalPages = Math.ceil(total / limit)
  const canWrite = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT'].includes(userRole)

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Library className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Knowledge Base</h1>
            <p className="text-xs md:text-sm text-muted">Documentazione interna e guide operative</p>
          </div>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => router.push('/kb/new')}>
            <Plus className="h-4 w-4" />
            Nuovo Articolo
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca articoli, tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Nessun articolo trovato"
          description={search || category ? 'Prova a modificare i filtri di ricerca.' : 'Crea il primo articolo della Knowledge Base.'}
          action={
            canWrite && !search && !category ? (
              <Button onClick={() => router.push('/kb/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Articolo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {pages.map((item) => (
              <Card
                key={item.id}
                className="!p-4 cursor-pointer hover:shadow-[var(--shadow-md)] transition-all duration-200"
                onClick={() => router.push(`/kb/${item.id}`)}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    name={`${item.author.firstName} ${item.author.lastName}`}
                    src={item.author.avatarUrl || undefined}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{item.title}</h3>
                      {item.isPublished ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                          <Eye className="h-3 w-3" /> Pubblicato
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-muted bg-secondary/60 px-1.5 py-0.5 rounded-full">
                          <EyeOff className="h-3 w-3" /> Bozza
                        </span>
                      )}
                    </div>
                    {item.excerpt && (
                      <p className="text-xs text-muted line-clamp-2 mb-2">{item.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_OPTIONS.find(c => c.value === item.category)?.label || item.category}
                      </Badge>
                      {item.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[10px] text-muted">+{item.tags.length - 3}</span>
                      )}
                      <span className="text-[10px] text-muted ml-auto">
                        {new Date(item.updatedAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">
                {total} articol{total !== 1 ? 'i' : 'o'} totali
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
