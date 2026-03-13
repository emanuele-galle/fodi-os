'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Sparkles } from 'lucide-react'

interface GenerateEmailButtonProps {
  clientId: string
}

export function GenerateEmailButton({ clientId }: GenerateEmailButtonProps) {
  const router = useRouter()

  const handleClick = useCallback(() => {
    router.push(`/crm/comunicazioni?clientId=${clientId}`)
  }, [clientId, router])

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Sparkles className="h-4 w-4 mr-1.5" />
      Genera Email
    </Button>
  )
}
