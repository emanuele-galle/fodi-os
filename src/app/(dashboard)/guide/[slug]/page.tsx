'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { getGuideBySlug, getAdjacentGuides } from '@/lib/guide-data'
import { AnimatedDemo } from '@/components/guide/AnimatedDemo'
import { GuideFeatureCard } from '@/components/guide/GuideFeatureCard'
import { GuideWorkflow } from '@/components/guide/GuideWorkflow'
import { GuideTips } from '@/components/guide/GuideTips'
import { GuideFAQ } from '@/components/guide/GuideFAQ'
import { GuideNav } from '@/components/guide/GuideNav'

export default function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const guide = getGuideBySlug(slug)

  if (!guide) notFound()

  const { prev, next } = getAdjacentGuides(slug)
  const Icon = guide.icon

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/guide" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Centro Guida
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{guide.title}</span>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start gap-4 mb-5">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${guide.heroColor}15` }}
          >
            <Icon className="h-6 w-6" style={{ color: guide.heroColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: guide.heroColor }}
              >
                {guide.number}
              </div>
              <h1 className="text-xl font-bold">{guide.title}</h1>
            </div>
            <p className="text-sm text-muted">{guide.subtitle}</p>
          </div>
        </div>

        {/* Animated Demo */}
        <AnimatedDemo slug={guide.slug} color={guide.heroColor} videoUrl={guide.videoUrl} />
      </motion.div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-sm text-muted leading-relaxed">{guide.description}</p>
      </motion.div>

      {/* Features */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-muted" />
          <h2 className="text-base font-semibold">Funzionalita principali</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guide.features.map((f, i) => (
            <GuideFeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              description={f.description}
              index={i}
              color={guide.heroColor}
            />
          ))}
        </div>
      </div>

      {/* Workflow */}
      <div>
        <h2 className="text-base font-semibold mb-4">Come iniziare</h2>
        <GuideWorkflow steps={guide.workflow} color={guide.heroColor} />
      </div>

      {/* Tips */}
      <div>
        <h2 className="text-base font-semibold mb-4">Consigli pratici</h2>
        <GuideTips tips={guide.tips} />
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-base font-semibold mb-4">Domande frequenti</h2>
        <GuideFAQ items={guide.faq} />
      </div>

      {/* Related modules */}
      {guide.relatedModules.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Moduli correlati</h2>
          <div className="flex flex-wrap gap-2">
            {guide.relatedModules.map(slug => {
              const related = getGuideBySlug(slug)
              if (!related) return null
              const RelIcon = related.icon
              return (
                <Link
                  key={slug}
                  href={`/guide/${slug}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <RelIcon className="h-3.5 w-3.5" style={{ color: related.heroColor }} />
                  <span className="text-xs font-medium">{related.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Prev / Next */}
      <GuideNav prev={prev} next={next} />
    </div>
  )
}
