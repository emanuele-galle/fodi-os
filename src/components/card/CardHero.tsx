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
    <div className="flex flex-col items-center text-center">
      {/* Avatar with animated ring */}
      <div className="relative mb-8">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-2xl scale-150 animate-pulse-slow" />

        {/* Spinning gradient border */}
        <div className="relative w-36 h-36">
          <div
            className="absolute inset-0 rounded-full animate-spin-slow"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(139,92,246,0.5), transparent, rgba(99,102,241,0.5), transparent)',
              padding: '2px',
            }}
          >
            <div className="w-full h-full rounded-full bg-[#0a0a0f]" />
          </div>

          {/* Static inner ring */}
          <div className="absolute inset-[2px] rounded-full border border-white/10" />

          {/* Avatar */}
          <div className="absolute inset-[6px] rounded-full overflow-hidden bg-[#12121a]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName}
                width={140}
                height={140}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-indigo-600/30 flex items-center justify-center text-white/80 text-3xl font-light tracking-wide">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <h1 className="text-[28px] font-semibold tracking-tight text-white leading-tight">
        {fullName}
      </h1>

      {/* Job title */}
      {jobTitle && (
        <p className="mt-2 text-[15px] font-medium text-purple-400/90">
          {jobTitle}
        </p>
      )}

      {/* Department badge */}
      {department && (
        <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium px-3.5 py-1.5 rounded-full bg-white/[0.04] text-white/50 border border-white/[0.06] tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {department}
        </div>
      )}

      {/* Bio */}
      {cardBio && (
        <p className="mt-5 text-[14px] leading-[1.8] text-white/40 max-w-[320px]">
          {cardBio}
        </p>
      )}
    </div>
  )
}
