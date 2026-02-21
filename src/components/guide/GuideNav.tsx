'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { GuideModule } from '@/lib/guide-data'

interface GuideNavProps {
  prev?: GuideModule
  next?: GuideModule
}

export function GuideNav({ prev, next }: GuideNavProps) {
  return (
    <div className="flex items-stretch gap-3 pt-6 border-t border-border/30">
      {prev ? (
        <Link
          href={`/guide/${prev.slug}`}
          className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-border/30 hover:bg-secondary/30 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 text-muted group-hover:text-foreground transition-colors" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted">Precedente</p>
            <p className="text-sm font-medium truncate">{prev.title}</p>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={`/guide/${next.slug}`}
          className="flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border border-border/30 hover:bg-secondary/30 transition-colors group text-right"
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted">Successivo</p>
            <p className="text-sm font-medium truncate">{next.title}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted group-hover:text-foreground transition-colors" />
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}
