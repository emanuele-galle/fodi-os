'use client'

import { DynamicWatermark } from './DynamicWatermark'
import { useScreenProtection } from '@/hooks/useScreenProtection'

interface ContentProtectionProps {
  protectionLevel: 'NONE' | 'WATERMARK' | 'WATERMARK_DETECT'
  userEmail: string
  userName: string
  children: React.ReactNode
}

function ProtectedContent({
  protectionLevel,
  userEmail,
  userName,
  children,
}: ContentProtectionProps) {
  useScreenProtection(
    protectionLevel === 'WATERMARK_DETECT' ? undefined : undefined
  )

  return (
    <div className="training-protected relative">
      {children}
      <DynamicWatermark userName={userName} userEmail={userEmail} />
    </div>
  )
}

function WatermarkDetectContent({
  userEmail,
  userName,
  children,
}: Omit<ContentProtectionProps, 'protectionLevel'>) {
  useScreenProtection()

  return (
    <div className="training-protected relative">
      {children}
      <DynamicWatermark userName={userName} userEmail={userEmail} />
    </div>
  )
}

export function ContentProtection({
  protectionLevel,
  userEmail,
  userName,
  children,
}: ContentProtectionProps) {
  if (protectionLevel === 'NONE') {
    return <>{children}</>
  }

  if (protectionLevel === 'WATERMARK_DETECT') {
    return (
      <WatermarkDetectContent userEmail={userEmail} userName={userName}>
        {children}
      </WatermarkDetectContent>
    )
  }

  return (
    <ProtectedContent
      protectionLevel={protectionLevel}
      userEmail={userEmail}
      userName={userName}
    >
      {children}
    </ProtectedContent>
  )
}
