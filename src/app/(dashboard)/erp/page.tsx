'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, CreditCard, BarChart3, ArrowRight, Landmark, RefreshCw, FileSignature, FileCode, Wand2, TrendingUp, Building2, Calendar, CalendarRange, Settings, FileCheck, BookOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid'

const MarginChart = dynamic(() => import('@/components/erp/MarginChart').then(m => ({ default: m.MarginChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})

export default function ErpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    draftQuotes: 0,
    monthExpenses: 0,
    activeSubscriptions: 0,
    monthlySubCost: 0,
    pendingSignatures: 0,
    templateCount: 0,
    publishedWizards: 0,
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/quotes?status=DRAFT&limit=1').then((r) => (r.ok ? r.json() : { total: 0 })),
      fetch('/api/expenses?limit=100').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/expenses/subscriptions?status=active&limit=100').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/signatures?status=PENDING&limit=1').then((r) => (r.ok ? r.json() : { total: 0 })),
      fetch('/api/quote-templates?limit=1').then((r) => (r.ok ? r.json() : { total: 0 })),
      fetch('/api/wizards?status=PUBLISHED&limit=1').then((r) => (r.ok ? r.json() : { total: 0 })),
    ])
      .then(([quotesData, expensesData, subsData, sigData, templData, wizData]) => {
        const now = new Date()
        const thisMonth = expensesData.items?.filter((e: { date: string }) => {
          const d = new Date(e.date)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }) || []
        const monthTotal = thisMonth.reduce(
          (s: number, e: { amount: string }) => s + parseFloat(e.amount),
          0
        )

        const subs = subsData.items || []
        const monthlySubCost = subs.reduce((s: number, sub: { amount: string; frequency: string }) => {
          const amt = parseFloat(sub.amount)
          if (sub.frequency === 'quarterly') return s + amt / 3
          if (sub.frequency === 'yearly') return s + amt / 12
          return s + amt
        }, 0)

        setStats({
          draftQuotes: quotesData.total || 0,
          monthExpenses: monthTotal,
          activeSubscriptions: subs.length,
          monthlySubCost,
          pendingSignatures: sigData.total || 0,
          templateCount: templData.total || 0,
          publishedWizards: wizData.total || 0,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const sections = [
    {
      title: 'Entrate',
      description: 'Registro entrate e fatture',
      icon: TrendingUp,
      href: '/erp/income',
      stat: null,
    },
    {
      title: 'Spese',
      description: 'Registrazione e analisi costi',
      icon: CreditCard,
      href: '/erp/expenses',
      stat: loading ? null : `${formatCurrency(stats.monthExpenses)} questo mese`,
    },
    {
      title: 'Conti & Giroconti',
      description: 'Gestione conti bancari e trasferimenti',
      icon: Building2,
      href: '/erp/accounts',
      stat: null,
    },
    {
      title: 'Prima Nota',
      description: 'Registro cronologico di tutti i movimenti',
      icon: BookOpen,
      href: '/erp/journal',
      stat: null,
    },
    {
      title: 'Dashboard Mensile',
      description: 'Panoramica finanziaria del mese',
      icon: Calendar,
      href: '/erp/dashboard/monthly',
      stat: null,
    },
    {
      title: 'Dashboard Annuale',
      description: 'Panoramica finanziaria annuale',
      icon: CalendarRange,
      href: '/erp/dashboard/annual',
      stat: null,
    },
    {
      title: 'Statistiche',
      description: 'Andamento mensile e proiezioni',
      icon: BarChart3,
      href: '/erp/dashboard/statistics',
      stat: null,
    },
    {
      title: 'Preventivi',
      description: 'Crea e gestisci preventivi per i clienti',
      icon: FileText,
      href: '/erp/quotes',
      stat: loading ? null : `${stats.draftQuotes} bozze`,
    },
    {
      title: 'Abbonamenti',
      description: 'Spese ricorrenti e sottoscrizioni',
      icon: RefreshCw,
      href: '/erp/expenses/subscriptions',
      stat: loading ? null : `${stats.activeSubscriptions} attivi · ${formatCurrency(stats.monthlySubCost)}/mese`,
    },
    {
      title: 'Monitoraggio Fatture',
      description: 'Fatture ricorrenti e scadenze',
      icon: FileCheck,
      href: '/erp/invoice-monitoring',
      stat: null,
    },
    {
      title: 'Firme Digitali',
      description: 'Richieste di firma documenti',
      icon: FileSignature,
      href: '/erp/signatures',
      stat: loading ? null : `${stats.pendingSignatures} in attesa`,
    },
    {
      title: 'Template',
      description: 'Modelli preventivo riutilizzabili',
      icon: FileCode,
      href: '/erp/templates',
      stat: loading ? null : `${stats.templateCount} template`,
    },
    {
      title: 'Wizard',
      description: 'Questionari e moduli interattivi',
      icon: Wand2,
      href: '/erp/wizards',
      stat: loading ? null : `${stats.publishedWizards} pubblicati`,
    },
    {
      title: 'Report',
      description: 'Analisi finanziaria e statistiche',
      icon: BarChart3,
      href: '/erp/reports',
      stat: null,
    },
    {
      title: 'Impostazioni',
      description: 'Categorie, conti e configurazione',
      icon: Settings,
      href: '/erp/settings',
      stat: null,
    },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">ERP</h1>
          <p className="text-xs md:text-sm text-muted">Contabilità, preventivi, spese e report</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card
              key={section.href}
              className="cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.02] transition-all duration-200 touch-manipulation active:scale-[0.98] group"
              onClick={() => router.push(section.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  {loading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : section.stat ? (
                    <Badge variant="outline" className="text-xs md:text-sm font-semibold">{section.stat}</Badge>
                  ) : null}
                </div>
                <CardTitle className="mt-3 text-base md:text-lg">{section.title}</CardTitle>
                <CardDescription className="text-sm">{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                  Vai alla sezione <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!loading && (
        <div className="mt-6">
          <QuickActionsGrid
            actions={[
              { icon: TrendingUp, title: 'Entrata', description: 'Registra', onClick: () => router.push('/erp/income') },
              { icon: CreditCard, title: 'Spesa', description: 'Registra', onClick: () => router.push('/erp/expenses') },
              { icon: FileText, title: 'Preventivo', description: 'Crea nuovo', onClick: () => router.push('/erp/quotes/new') },
              { icon: Calendar, title: 'Dashboard', description: 'Mensile', onClick: () => router.push('/erp/dashboard/monthly') },
              { icon: Settings, title: 'Impostazioni', description: 'Configura', onClick: () => router.push('/erp/settings') },
            ]}
          />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Margine per Progetto</CardTitle>
          <CardDescription>Confronto ricavi vs costi per ciascun progetto</CardDescription>
        </CardHeader>
        <CardContent>
          <MarginChart />
        </CardContent>
      </Card>
    </div>
  )
}
