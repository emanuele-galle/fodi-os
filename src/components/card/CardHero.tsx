import Image from 'next/image'

type CardHeroProps = {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  jobTitle?: string | null
  cardBio?: string | null
  department?: string | null
  logoUrl?: string | null
}

export default function CardHero({
  firstName,
  lastName,
  avatarUrl,
  jobTitle,
  cardBio,
  department,
  logoUrl,
}: CardHeroProps) {
  const fullName = `${firstName} ${lastName}`
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase()

  return (
    <div className="flex flex-col items-center text-center space-y-5">
      {/* Company logo header */}
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt="Company"
          width={56}
          height={56}
          className="h-14 w-auto object-contain"
        />
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
          F
        </div>
      )}

      {/* Avatar with rotating gradient border */}
      <div className="relative">
        {/* Soft glow behind avatar */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-indigo-500/30 rounded-full blur-2xl scale-150" />

        {/* Rotating gradient ring */}
        <div className="relative w-40 h-40">
          <div className="absolute inset-0 rounded-full bg-gradient-conic from-purple-500 via-violet-400 via-indigo-500 via-purple-600 to-purple-500 animate-gradient-rotate p-[3px]" style={{
            background: 'conic-gradient(from 0deg, #a855f7, #8b5cf6, #6366f1, #a855f7)',
          }}>
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-950" />
          </div>
          {/* Avatar image on top */}
          <div className="absolute inset-[4px] rounded-full overflow-hidden bg-white dark:bg-gray-900">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName}
                width={152}
                height={152}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name & info */}
      <div className="space-y-2">
        <h1 className="text-[30px] font-extrabold tracking-tight text-gray-900 dark:text-white leading-none">
          {fullName}
        </h1>

        {jobTitle && (
          <p className="text-[16px] font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {jobTitle}
          </p>
        )}

        {department && (
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5 rounded-full bg-purple-500/8 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/15 dark:border-purple-500/20">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            {department}
          </div>
        )}
      </div>

      {/* Bio */}
      {cardBio && (
        <p className="text-[15px] leading-[1.7] text-gray-500 dark:text-gray-400 max-w-[320px] mx-auto">
          {cardBio}
        </p>
      )}
    </div>
  )
}
