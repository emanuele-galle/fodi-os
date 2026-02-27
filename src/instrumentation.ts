export async function register() {
  // Only run in Node.js runtime (not Edge), and only in production
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { startScheduler } = await import('@/lib/scheduler')
    startScheduler()
  }
}
