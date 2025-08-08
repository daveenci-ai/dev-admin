type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

function getEnvLogLevel(): LogLevel {
  const fromEnv = (process.env.LOG_LEVEL || '').toLowerCase() as LogLevel
  if (fromEnv === 'debug' || fromEnv === 'info' || fromEnv === 'warn' || fromEnv === 'error' || fromEnv === 'silent') {
    return fromEnv
  }
  // Default: quieter in production
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
}

const levelOrder: Record<Exclude<LogLevel, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function shouldLog(desired: Exclude<LogLevel, 'silent'>, current: LogLevel) {
  if (current === 'silent') return false
  return levelOrder[desired] >= levelOrder[(current as Exclude<LogLevel, 'silent'>)]
}

const currentLevel = getEnvLogLevel()

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug', currentLevel)) console.debug(...args)
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info', currentLevel)) console.info(...args)
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn', currentLevel)) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error', currentLevel)) console.error(...args)
  },
}

export default logger


