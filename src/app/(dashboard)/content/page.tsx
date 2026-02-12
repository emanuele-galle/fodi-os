'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Film, ClipboardCheck, CalendarDays, ArrowRight, LayoutGrid } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

interface AssetPreview {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  category: string
  createdAt: string
}

export default function ContentPage() {
  const router = useRouter()
  const [recentAssets, setRecentAssets] = useState<AssetPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ assets: 0, pendingReviews: 0, scheduledPosts: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/assets?limit=6').then((r) => (r.ok ? r.json() : { items: [], total: 0 })),
      fetch('/api/assets/reviews?status=PENDING').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/social?status=SCHEDULED').then((r) => (r.ok ? r.json() : { items: [] })),
    ])
      .then(([assetsData, reviewsData, socialData]) => {
        setRecentAssets(assetsData.items || [])
        setCounts({
          assets: assetsData.total || assetsData.items?.length || 0,
          pendingReviews: reviewsData.items?.length || 0,
          scheduledPosts: socialData.items?.length || 0,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const sections = [
    {
      title: 'Asset Library',
      description: 'Immagini, video, documenti e file del team',
      icon: Film,
      href: '/content/assets',
      count: counts.assets,
      countLabel: 'asset',
    },
    {
      title: 'Review',
      description: 'Approvazione e feedback sui contenuti',
      icon: ClipboardCheck,
      href: '/content/reviews',
      count: counts.pendingReviews,
      countLabel: 'in attesa',
    },
    {
      title: 'Social Calendar',
      description: 'Pianificazione e pubblicazione post social',
      icon: CalendarDays,
      href: '/content/social',
      count: counts.scheduledPosts,
      countLabel: 'programmati',
    },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0" style={{ background: 'var(--gold-gradient)' }}>
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Contenuti</h1>
            <p className="text-xs md:text-sm text-muted">Gestisci asset, review e social media</p>
          </div>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-stagger">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card
              key={section.href}
              className="cursor-pointer hover:scale-[1.01] transition-all duration-200 glass-card accent-line-top shadow-lift"
              onClick={() => router.push(section.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {loading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <Badge variant="outline">
                      {section.count} {section.countLabel}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="p-0 text-primary">
                  Vai alla sezione <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Assets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Asset Recenti</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/content/assets')}>
            Vedi tutti <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : recentAssets.length === 0 ? (
          <p className="text-sm text-muted py-4">Nessun asset ancora. Carica il primo dalla Asset Library.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-lg border border-border overflow-hidden bg-card glow-gold cursor-pointer"
                onClick={() => router.push('/content/assets')}
              >
                <div className="h-20 bg-secondary flex items-center justify-center overflow-hidden">
                  {asset.mimeType.startsWith('image/') ? (
                    <img
                      src={asset.fileUrl}
                      alt={asset.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="h-6 w-6 text-muted" />
                  )}
                </div>
                <p className="px-2 py-1.5 text-xs truncate">{asset.fileName}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
