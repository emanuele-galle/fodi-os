export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold">FODI OS</h2>
        </div>
        <nav className="px-4">
          <p className="text-sm text-muted px-2">Navigazione in costruzione</p>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
