export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
      {/* Ambient light effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-400/15 dark:bg-purple-500/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-400/15 dark:bg-indigo-500/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-300/8 dark:bg-violet-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Subtle dot pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-4 text-center">
        <a
          href="https://fodisrl.it"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-gray-400/60 dark:text-gray-500/40 hover:text-purple-500/60 transition-colors duration-300"
        >
          Powered by <span className="font-bold">FODI</span>
        </a>
      </footer>
    </div>
  )
}
