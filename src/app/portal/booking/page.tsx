'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardHeading } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import BookingWidget from '@/components/portal/BookingWidget'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  jobTitle: string | null
}

export default function PortalBookingPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/booking/team')
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data) => setTeamMembers(data.members || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Prenota un Appuntamento</h1>
        <p className="text-sm text-muted mt-1">
          Scegli un membro del team e prenota un incontro
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardHeading>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Prenotazione
            </CardTitle>
            <CardDescription>
              Seleziona data e orario disponibile
            </CardDescription>
          </CardHeading>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : teamMembers.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nessun membro disponibile"
              description="Al momento non ci sono membri del team con il calendario connesso."
            />
          ) : (
            <BookingWidget teamMembers={teamMembers} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
