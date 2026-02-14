'use client'

import { use } from 'react'
import { WizardBuilder } from '@/components/erp/WizardBuilder'

export default function WizardDetailPage({ params }: { params: Promise<{ wizardId: string }> }) {
  const { wizardId } = use(params)
  return <WizardBuilder wizardId={wizardId} />
}
