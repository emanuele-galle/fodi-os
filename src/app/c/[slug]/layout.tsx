export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
      {children}
      {/* Footer branding */}
      <footer className="pb-8 pt-4 text-center">
        <a
          href="https://fodisrl.it"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Powered by <span className="font-semibold">FODI</span>
        </a>
      </footer>
    </div>
  )
}
