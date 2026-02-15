'use client'

import { AnalyticsOverview } from '@/components/training/admin/AnalyticsOverview'
import { UserProgressTable } from '@/components/training/admin/UserProgressTable'

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-8">
      <AnalyticsOverview />
      <UserProgressTable />
    </div>
  )
}
