// Secure error logging utility
// Ensures secrets are never logged and provides structured logging

interface LogContext {
  userId?: string
  requestId?: string
  endpoint?: string
  [key: string]: any
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
function sanitizeError(error: unknown): any {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }
  return { error: String(error) }
}

/**
 * Sanitize context for logging (remove sensitive fields)
 */
function sanitizeContext(context: LogContext): LogContext {
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'cookie',
    'session',
  ]
  
  const sanitized: LogContext = {}
  
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value as LogContext)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Log error with context
 */
export function logError(
  message: string,
  error: unknown,
  context?: LogContext
): void {
  const timestamp = new Date().toISOString()
  const sanitizedError = sanitizeError(error)
  const sanitizedContext = context ? sanitizeContext(context) : {}
  
  console.error(JSON.stringify({
    timestamp,
    level: 'error',
    message,
    error: sanitizedError,
    context: sanitizedContext,
  }))
}

/**
 * Log warning with context
 */
export function logWarning(
  message: string,
  context?: LogContext
): void {
  const timestamp = new Date().toISOString()
  const sanitizedContext = context ? sanitizeContext(context) : {}
  
  console.warn(JSON.stringify({
    timestamp,
    level: 'warning',
    message,
    context: sanitizedContext,
  }))
}

/**
 * Log info with context
 */
export function logInfo(
  message: string,
  context?: LogContext
): void {
  const timestamp = new Date().toISOString()
  const sanitizedContext = context ? sanitizeContext(context) : {}
  
  console.log(JSON.stringify({
    timestamp,
    level: 'info',
    message,
    context: sanitizedContext,
  }))
}

/**
 * Log provider failure with graceful degradation
 */
export function logProviderFailure(
  provider: string,
  operation: string,
  error: unknown,
  fallbackUsed: boolean
): void {
  logWarning(`Provider ${provider} failed for ${operation}`, {
    provider,
    operation,
    error: sanitizeError(error),
    fallbackUsed,
    degraded: true,
  })
}

/**
 * Log external API failure
 */
export function logExternalAPIFailure(
  service: string,
  endpoint: string,
  error: unknown,
  statusCode?: number
): void {
  logError(`External API ${service} failed`, error, {
    service,
    endpoint,
    statusCode,
    external: true,
  })
}
