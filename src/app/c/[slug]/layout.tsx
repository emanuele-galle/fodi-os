export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/30">
      {/* Animated background orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-200/10 dark:bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-2 text-center">
        <a
          href="https://fodisrl.it"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] tracking-wide uppercase text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
        >
          Powered by <span className="font-bold">FODI</span>
        </a>
      </footer>
    </div>
  )
}
