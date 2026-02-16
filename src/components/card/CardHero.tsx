import Image from 'next/image'

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
    <div className="text-center space-y-5">
      {/* Avatar with animated gradient ring */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 rounded-full blur-sm opacity-60" />
          <div className="relative w-28 h-28 rounded-full ring-[3px] ring-white dark:ring-gray-900 overflow-hidden">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name and title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
          {fullName}
        </h1>

        {jobTitle && (
          <p className="text-base font-medium text-purple-600 dark:text-purple-400">
            {jobTitle}
          </p>
        )}

        {department && (
          <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20">
            {department}
          </span>
        )}
      </div>

      {/* Bio */}
      {cardBio && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto px-2">
          {cardBio}
        </p>
      )}

      {/* Decorative divider */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-300 dark:to-purple-600" />
        <div className="h-1.5 w-1.5 rounded-full bg-purple-400 dark:bg-purple-500" />
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-300 dark:to-purple-600" />
      </div>
    </div>
  )
}
