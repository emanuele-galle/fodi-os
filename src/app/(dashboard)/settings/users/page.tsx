'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

interface UserItem {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
}

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'destructive' as const
    case 'MANAGER': return 'warning' as const
    case 'SALES': return 'success' as const
    default: return 'default' as const
  }
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data?.users) setUsers(data.users)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestione Utenti</h1>
      </div>

      <Card>
        <CardTitle>Team FODI</CardTitle>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted">Caricamento...</p>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 py-3">
                  <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-sm text-muted truncate">{u.email}</p>
                  </div>
                  <Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge>
                  <Badge variant={u.isActive ? 'success' : 'outline'}>
                    {u.isActive ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
