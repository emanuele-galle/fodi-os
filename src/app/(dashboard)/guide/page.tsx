'use client'
import { brandClient } from '@/lib/branding-client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { BookOpen, RefreshCw, Search } from 'lucide-react'
import { GUIDE_MODULES } from '@/lib/guide-data'

export default function GuidePage() {
  const [search, setSearch] = useState('')

  const filtered = GUIDE_MODULES.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleReplayOnboarding = async () => {
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
    } catch {}
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Centro Guida</h1>
            <p className="text-sm text-muted">Scopri tutte le funzionalita di {brandClient.name}</p>
          </div>
        </div>
        <button
          onClick={handleReplayOnboarding}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Rivedi onboarding
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca nella guida..."
          className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-border/40 bg-card placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((mod, i) => {
          const Icon = mod.icon
          return (
            <motion.div
              key={mod.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Link
                href={`/guide/${mod.slug}`}
                className="group block h-full rounded-xl border border-border/40 bg-card p-5 hover:border-border/60 hover:shadow-lg hover:shadow-black/5 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${mod.heroColor}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: mod.heroColor }} />
                  </div>
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: mod.heroColor }}
                  >
                    {mod.number}
                  </div>
                </div>

                <h3 className="text-sm font-semibold mb-1">{mod.title}</h3>
                <p className="text-xs text-muted mb-3 line-clamp-2">{mod.subtitle}</p>

                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span>{mod.features.length} funzionalita</span>
                  <span className="h-1 w-1 rounded-full bg-muted/40" />
                  <span>{mod.tips.length} consigli</span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted">
          Nessun risultato per &quot;{search}&quot;
        </div>
      )}
    </div>
  )
}
