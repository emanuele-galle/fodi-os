'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- event handlers and dynamic styles */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Library, Plus, Search, FileText } from 'lucide-react'
import { KB_CATEGORIES, getCategoryMeta } from '@/lib/kb-config'

interface KbArticle {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string
  tags: string[]
  isPublished: boolean
  sortOrder: number
  parentId: string | null
  updatedAt: string
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  _count?: { children: number }
  children?: { id: string; title: string; slug: string }[]
}

export default function KbPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => { if (data.user) setUserRole(data.user.role) })
      .catch(() => {})
  }, [])

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' })
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      const res = await fetch(`/api/kb?${params}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.items || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  const canWrite = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT'].includes(userRole)

  // Show only parent articles (no parentId) on the main page
  const parentArticles = articles.filter(a => !a.parentId)
  // Group children by parentId
  const childrenMap = new Map<string, KbArticle[]>()
  for (const a of articles) {
    if (a.parentId) {
      const arr = childrenMap.get(a.parentId) ?? []
      arr.push(a)
      childrenMap.set(a.parentId, arr)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Library className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Knowledge Base</h1>
            <p className="text-sm text-muted">Documentazione interna e know-how aziendale</p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => router.push('/kb/new')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuovo Articolo
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca nella Knowledge Base..."
          className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-border/40 bg-card placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !category ? 'bg-primary text-white' : 'bg-secondary/50 text-muted hover:text-foreground'
          }`}
        >
          Tutti
        </button>
        {KB_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(category === cat.value ? '' : cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
              category === cat.value
                ? 'text-white'
                : 'bg-secondary/50 text-muted hover:text-foreground'
            }`}
            style={category === cat.value ? { backgroundColor: cat.color } : undefined}
          >
            <cat.icon className="h-3 w-3" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl border border-border/40 bg-card animate-pulse" />
          ))}
        </div>
      ) : parentArticles.length === 0 ? (
        <div className="text-center py-16">
          <Library className="h-12 w-12 text-muted/30 mx-auto mb-4" />
          <p className="text-sm text-muted">
            {search || category ? 'Nessun articolo trovato con questi filtri.' : 'La Knowledge Base e vuota.'}
          </p>
          {canWrite && !search && !category && (
            <button
              onClick={() => router.push('/kb/new')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Crea il primo articolo
            </button>
          )}
        </div>
      ) : (
        /* Article cards grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parentArticles.map((article, i) => {
            const meta = getCategoryMeta(article.category)
            const Icon = meta.icon
            const children = childrenMap.get(article.id) ?? []

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <button
                  onClick={() => router.push(`/kb/${article.id}`)}
                  className="group block w-full text-left h-full rounded-xl border border-border/40 bg-card p-5 hover:border-border/60 hover:shadow-lg hover:shadow-black/5 transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${meta.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold mb-1.5 line-clamp-2">{article.title}</h3>
                  {article.excerpt && (
                    <p className="text-xs text-muted mb-3 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-muted mt-auto">
                    {children.length > 0 && (
                      <>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {children.length} sotto-pagine
                        </span>
                        <span className="h-1 w-1 rounded-full bg-muted/40" />
                      </>
                    )}
                    {article.tags.length > 0 && (
                      <>
                        <span>{article.tags.length} tag</span>
                        <span className="h-1 w-1 rounded-full bg-muted/40" />
                      </>
                    )}
                    <span>{new Date(article.updatedAt).toLocaleDateString('it-IT')}</span>
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
