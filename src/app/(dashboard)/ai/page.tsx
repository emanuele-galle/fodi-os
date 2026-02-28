'use client'

import { useState, useEffect } from 'react'
import { AiFullscreenLayout } from '@/components/ai/AiFullscreenLayout'

export default function AiPage() {
  const [userName, setUserName] = useState<string | undefined>()

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user?.firstName) setUserName(data.user.firstName)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="h-[calc(100vh-3.5rem)] relative">
      <AiFullscreenLayout userName={userName} />
    </div>
  )
}
