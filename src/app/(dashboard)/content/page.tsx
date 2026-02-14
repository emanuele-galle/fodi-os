'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Film, ClipboardCheck, CalendarDays, ArrowRight, LayoutGrid, ImageOff, Upload, Plus, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface AssetPreview {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  category: string
  createdAt: string
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'adesso'
  if (diffMin < 60) return `${diffMin} minut${diffMin === 1 ? 'o' : 'i'} fa`
  if (diffHours < 24) return `${diffHours} or${diffHours === 1 ? 'a' : 'e'} fa`
  if (diffDays === 1) return 'ieri'
  if (diffDays < 7) return `${diffDays} giorni fa`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settiman${Math.floor(diffDays / 7) === 1 ? 'a' : 'e'} fa`
  return `${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) === 1 ? 'e' : 'i'} fa`
}

function getBadgeVariant(type: 'assets' | 'reviews' | 'social', count: number): string {
  if (type === 'assets') return count > 0 ? 'success' : 'outline'
  if (type === 'reviews') {
    if (count > 3) return 'destructive'
    if (count > 0) return 'warning'
    return 'outline'
  }
  // social
  return count > 0 ? 'default' : 'outline'
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
      badgeType: 'assets' as const,
    },
    {
      title: 'Review',
      description: 'Approvazione e feedback sui contenuti',
      icon: ClipboardCheck,
      href: '/content/reviews',
      count: counts.pendingReviews,
      countLabel: 'in attesa',
      badgeType: 'reviews' as const,
    },
    {
      title: 'Social Calendar',
      description: 'Pianificazione e pubblicazione post social',
      icon: CalendarDays,
      href: '/content/social',
      count: counts.scheduledPosts,
      countLabel: 'programmati',
      badgeType: 'social' as const,
    },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Contenuti</h1>
            <p className="text-xs md:text-sm text-muted">Gestisci asset, review e social media</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/content/assets')}>
            <Upload className="h-4 w-4 mr-1" />
            Carica Asset
          </Button>
          <Button variant="default" size="sm" onClick={() => router.push('/content/social')}>
            <Plus className="h-4 w-4 mr-1" />
            Nuovo Post
          </Button>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-stagger">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card
              key={section.href}
              className="cursor-pointer hover:scale-[1.01] transition-all duration-200"
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
                    <Badge variant={getBadgeVariant(section.badgeType, section.count) as any}>
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
          <EmptyState
            icon={ImageOff}
            title="Nessun asset"
            description="Carica il primo file dalla Asset Library."
            action={
              <Button variant="outline" size="sm" onClick={() => router.push('/content/assets')}>
                <ArrowRight className="h-4 w-4 mr-1" />
                Vai alla Asset Library
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-lg border border-border overflow-hidden bg-card cursor-pointer"
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

      {/* Attività Recente */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted" />
          <h2 className="text-lg font-semibold">Attività Recente</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : recentAssets.length === 0 ? (
          <p className="text-sm text-muted">Nessuna attività recente.</p>
        ) : (
          <div className="border-l-2 border-border ml-2 pl-4 space-y-4">
            {recentAssets.slice(0, 5).map((asset) => (
              <div key={asset.id} className="flex items-start gap-3 relative">
                <div className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-primary/60 border-2 border-background" />
                <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    Asset caricato: <span className="font-medium">{asset.fileName}</span>
                  </p>
                  <p className="text-xs text-muted">{formatRelativeTime(asset.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
