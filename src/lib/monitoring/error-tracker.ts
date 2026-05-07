// Production Error Tracking and Monitoring
import { logger } from '../utils'

export interface ErrorContext {
  userId?: string
  sessionId?: string
  route?: string
  provider?: string
  operation?: string
  metadata?: Record<string, any>
}

export interface MonitoredError {
  message: string
  stack?: string
  context: ErrorContext
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class ErrorTracker {
  private errors: MonitoredError[] = []
  private readonly MAX_ERRORS = 1000 // Keep last 1000 errors in memory

  /**
   * Track an error with context
   */
  track(error: Error | unknown, context: ErrorContext, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    const monitoredError: MonitoredError = {
      message: errorMessage,
      stack: errorStack,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
      severity,
    }

    // Add to in-memory store
    this.errors.push(monitoredError)
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift() // Remove oldest
    }

    // Log with appropriate level
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn'
    logger[logLevel]('Error tracked', {
      message: errorMessage,
      severity,
      context: monitoredError.context,
    })

    // In production, this would send to external service (Sentry, etc.)
    // For now, we log and store in-memory for admin visibility
  }

  /**
   * Track OpenAI failures
   */
  trackOpenAIError(error: Error | unknown, operation: string, metadata?: Record<string, any>) {
    this.track(error, {
      provider: 'openai',
      operation,
      metadata,
    }, 'high')
  }

  /**
   * Track Supabase failures
   */
  trackSupabaseError(error: Error | unknown, operation: string, metadata?: Record<string, any>) {
    this.track(error, {
      provider: 'supabase',
      operation,
      metadata,
    }, 'high')
  }

  /**
   * Track provider failures
   */
  trackProviderError(provider: string, error: Error | unknown, operation: string, metadata?: Record<string, any>) {
    this.track(error, {
      provider,
      operation,
      metadata,
    }, 'medium')
  }

  /**
   * Track route-level errors
   */
  trackRouteError(route: string, error: Error | unknown, userId?: string, metadata?: Record<string, any>) {
    this.track(error, {
      route,
      userId,
      metadata,
    }, 'high')
  }

  /**
   * Track analysis failures
   */
  trackAnalysisError(error: Error | unknown, userId?: string, query?: string) {
    this.track(error, {
      operation: 'travel-analysis',
      userId,
      metadata: { query },
    }, 'high')
  }

  /**
   * Track ML/feedback pipeline failures
   */
  trackMLError(error: Error | unknown, operation: string, metadata?: Record<string, any>) {
    this.track(error, {
      operation: `ml-${operation}`,
      metadata,
    }, 'low') // ML failures are lower priority (have fallbacks)
  }

  /**
   * Get recent errors for admin dashboard
   */
  getRecentErrors(limit: number = 100): MonitoredError[] {
    return this.errors.slice(-limit).reverse()
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const recentErrors = this.errors.filter(e => new Date(e.timestamp).getTime() > oneDayAgo)
    const lastHourErrors = this.errors.filter(e => new Date(e.timestamp).getTime() > oneHourAgo)

    const errorsByProvider: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}

    recentErrors.forEach(error => {
      if (error.context.provider) {
        errorsByProvider[error.context.provider] = (errorsByProvider[error.context.provider] || 0) + 1
      }
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1
    })

    return {
      total: this.errors.length,
      last24Hours: recentErrors.length,
      lastHour: lastHourErrors.length,
      byProvider: errorsByProvider,
      bySeverity: errorsBySeverity,
    }
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized = { ...context }
    
    // Remove sensitive metadata
    if (sanitized.metadata) {
      const { apiKey, token, password, secret, ...safeMeta } = sanitized.metadata as any
      sanitized.metadata = safeMeta
    }

    return sanitized
  }

  /**
   * Clear old errors (for memory management)
   */
  clearOldErrors(olderThanDays: number = 7) {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    this.errors = this.errors.filter(e => new Date(e.timestamp).getTime() > cutoff)
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker()

// Auto-cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    errorTracker.clearOldErrors(7)
  }, 60 * 60 * 1000)
}
