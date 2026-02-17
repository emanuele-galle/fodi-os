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
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/25 to-blue-500/15 blur-3xl scale-[1.6] animate-pulse-slow" />

        {/* Spinning gradient border */}
        <div className="relative w-40 h-40">
          <div
            className="absolute inset-0 rounded-full animate-spin-slow p-[3px]"
            style={{
              background: 'conic-gradient(from 0deg, transparent 10%, rgba(139,92,246,0.6), transparent 40%, rgba(99,102,241,0.5), transparent 70%, rgba(168,85,247,0.4), transparent 90%)',
            }}
          >
            <div className="w-full h-full rounded-full bg-[#0a0a0f]" />
          </div>

          {/* Static inner ring for definition */}
          <div className="absolute inset-[3px] rounded-full border border-white/[0.08]" />

          {/* Avatar */}
          <div className="absolute inset-[6px] rounded-full overflow-hidden bg-[#12121a] ring-1 ring-white/[0.04]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-indigo-600/30 flex items-center justify-center text-white/70 text-4xl font-light tracking-wide">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <h1 className="text-[30px] font-bold tracking-tight text-white leading-tight">
        {fullName}
      </h1>

      {/* Job title */}
      {jobTitle && (
        <p className="mt-2.5 text-[16px] font-medium bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          {jobTitle}
        </p>
      )}

      {/* Department badge */}
      {department && (
        <div className="mt-3.5 inline-flex items-center gap-2 text-[11px] font-medium px-4 py-1.5 rounded-full bg-white/[0.04] text-white/45 border border-white/[0.06] tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {department}
        </div>
      )}

      {/* Bio */}
      {cardBio && (
        <p className="mt-6 text-[14px] leading-[1.8] text-white/35 max-w-[320px]">
          {cardBio}
        </p>
      )}
    </div>
  )
}
