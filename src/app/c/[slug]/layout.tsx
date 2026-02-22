import { brand } from '@/lib/branding'
export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="relative z-10 pb-10 pt-2 text-center">
        <a
          href={brand.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-white/15 hover:text-white/30 transition-colors duration-300"
        >
          Powered by <span className="font-semibold text-white/25">{brand.slug.toUpperCase()}</span>
        </a>
      </footer>
    </div>
  )
}
