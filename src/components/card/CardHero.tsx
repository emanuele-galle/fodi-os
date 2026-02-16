import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'

type CardHeroProps = {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  jobTitle?: string | null
  cardBio?: string | null
  department?: string | null
}

export default function CardHero({
  firstName,
  lastName,
  avatarUrl,
  jobTitle,
  cardBio,
  department,
}: CardHeroProps) {
  const fullName = `${firstName} ${lastName}`
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase()

  return (
    <div className="text-center space-y-4 animate-slide-up">
      {/* Avatar with gradient ring */}
      <div className="flex justify-center">
        <div className="relative w-24 h-24 rounded-full ring-2 ring-primary/50 ring-offset-4 ring-offset-background">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              fill
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* Name and title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>

        {jobTitle && (
          <p className="text-lg text-muted-foreground">{jobTitle}</p>
        )}

        {department && (
          <div className="flex justify-center">
            <Badge variant="default" className="text-sm">
              {department}
            </Badge>
          </div>
        )}
      </div>

      {/* Bio */}
      {cardBio && (
        <div className="pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {cardBio}
          </p>
        </div>
      )}

      {/* Decorative gradient */}
      <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent rounded-full opacity-50" />
    </div>
  )
}
