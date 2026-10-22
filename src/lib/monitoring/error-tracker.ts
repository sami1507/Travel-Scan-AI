// Production Error Tracking and Monitoring
// Errors are persisted to Supabase (ops_errors) so they survive serverless
// cold starts; in-memory arrays are a per-instance fallback for reads.
import { logger } from '../utils'
import { createAdminClient } from '../supabase/admin'

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

    // Persist to Supabase (fire-and-forget; never let tracking break the app)
    this.persist(monitoredError)

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
   * Get recent errors for admin dashboard (persisted storage, memory fallback)
   */
  async getRecentErrors(limit: number = 100): Promise<MonitoredError[]> {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('ops_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map((row: any) => ({
        message: row.message,
        stack: row.stack || undefined,
        context: row.context || {},
        timestamp: row.created_at,
        severity: row.severity,
      }))
    } catch (error) {
      logger.warn('Error tracker: DB read failed, using in-memory fallback', {
        error: error instanceof Error ? error.message : String(error),
      })
      return this.errors.slice(-limit).reverse()
    }
  }

  /**
   * Get error statistics (persisted storage, memory fallback)
   */
  async getErrorStats() {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    let errors = this.errors
    let persistedTotal: number | null = null

    try {
      const supabase = createAdminClient()
      const since = new Date(oneDayAgo).toISOString()

      const [recentResult, countResult] = await Promise.all([
        supabase
          .from('ops_errors')
          .select('severity, context, created_at')
          .gte('created_at', since)
          .limit(1000),
        supabase
          .from('ops_errors')
          .select('*', { count: 'exact', head: true }),
      ])

      if (recentResult.error) throw recentResult.error
      if (countResult.error) throw countResult.error

      persistedTotal = countResult.count ?? 0
      errors = (recentResult.data || []).map((row: any) => ({
        message: '',
        context: row.context || {},
        timestamp: row.created_at,
        severity: row.severity,
      }))
    } catch (error) {
      logger.warn('Error tracker: DB stats read failed, using in-memory fallback', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const recentErrors = errors.filter(e => new Date(e.timestamp).getTime() > oneDayAgo)
    const lastHourErrors = errors.filter(e => new Date(e.timestamp).getTime() > oneHourAgo)

    const errorsByProvider: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}

    recentErrors.forEach(err => {
      if (err.context.provider) {
        errorsByProvider[err.context.provider] = (errorsByProvider[err.context.provider] || 0) + 1
      }
      errorsBySeverity[err.severity] = (errorsBySeverity[err.severity] || 0) + 1
    })

    return {
      total: persistedTotal ?? this.errors.length,
      last24Hours: recentErrors.length,
      lastHour: lastHourErrors.length,
      byProvider: errorsByProvider,
      bySeverity: errorsBySeverity,
    }
  }

  /**
   * Persist an error to Supabase (best-effort, fire-and-forget)
   */
  private persist(error: MonitoredError) {
    try {
      const supabase = createAdminClient()
      void Promise.resolve(
        supabase.from('ops_errors').insert({
          message: error.message,
          stack: error.stack,
          context: error.context as any,
          severity: error.severity,
          created_at: error.timestamp,
        } as any)
      ).catch(persistError => {
        logger.warn('Error tracker: failed to persist error', {
          error: persistError instanceof Error ? persistError.message : String(persistError),
        })
      })
    } catch {
      // Admin client unavailable (missing env) — memory-only mode
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
