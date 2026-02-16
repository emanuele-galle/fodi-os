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
    <div className="flex flex-col items-center text-center space-y-5">
      {/* Avatar with animated glow ring */}
      <div className="relative group">
        {/* Outer glow */}
        <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 rounded-full opacity-40 blur-lg group-hover:opacity-60 transition-opacity duration-500" />
        {/* Ring */}
        <div className="relative p-[3px] rounded-full bg-gradient-to-br from-purple-500 via-violet-400 to-indigo-500">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white dark:bg-gray-900 ring-2 ring-white/50 dark:ring-gray-900/50">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName}
                width={112}
                height={112}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2.5">
        <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
          {fullName}
        </h1>

        {jobTitle && (
          <p className="text-[15px] font-semibold text-purple-600 dark:text-purple-400">
            {jobTitle}
          </p>
        )}

        {department && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-600 dark:text-gray-300 shadow-sm backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            {department}
          </div>
        )}
      </div>

      {/* Bio */}
      {cardBio && (
        <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
          {cardBio}
        </p>
      )}
    </div>
  )
}
