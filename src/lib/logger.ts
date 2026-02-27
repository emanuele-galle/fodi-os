type LogLevel = 'info' | 'warn' | 'error'

function formatLog(level: LogLevel, msg: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level.toUpperCase()}] ${msg}`
}

export const logger = {
  info(msg: string, data?: Record<string, unknown>) {
    console.log(formatLog('info', msg), data ?? '')
  },
  warn(msg: string, data?: Record<string, unknown>) {
    console.warn(formatLog('warn', msg), data ?? '')
  },
  error(msg: string, data?: Record<string, unknown>) {
    console.error(formatLog('error', msg), data ?? '')
  },
}
