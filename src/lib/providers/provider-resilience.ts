// Provider Resilience - Timeouts, Retries, and Fallbacks
import { logger } from '../utils'
import { errorTracker } from '../monitoring/error-tracker'
import { costTracker } from '../monitoring/cost-tracker'

export interface ResilienceConfig {
  timeout: number // milliseconds
  retries: number
  retryDelay: number // milliseconds
  fallbackValue?: any
  trackCost?: boolean
  provider?: string
}

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  timeout: 30000, // 30 seconds
  retries: 2,
  retryDelay: 1000, // 1 second
  trackCost: true,
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public operation: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

/**
 * Wrap a provider call with timeout, retries, and error tracking
 */
export async function withResilience<T>(
  operation: string,
  fn: () => Promise<T>,
  config: Partial<ResilienceConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RESILIENCE_CONFIG, ...config }
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= fullConfig.retries; attempt++) {
    try {
      // Add timeout
      const result = await withTimeout(fn(), fullConfig.timeout)
      
      // Track cost if enabled
      if (fullConfig.trackCost && fullConfig.provider) {
        costTracker.trackProvider(fullConfig.provider, operation)
      }

      // Log success on retry
      if (attempt > 0) {
        logger.info('Provider: Retry succeeded', {
          provider: fullConfig.provider,
          operation,
          attempt,
        })
      }

      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Track error
      if (fullConfig.provider) {
        errorTracker.trackProviderError(
          fullConfig.provider,
          error,
          operation,
          { attempt }
        )
      }

      // Check if we should retry
      if (attempt < fullConfig.retries && isRetryable(error)) {
        logger.warn('Provider: Retrying after error', {
          provider: fullConfig.provider,
          operation,
          attempt: attempt + 1,
          error: lastError.message,
        })
        
        // Wait before retry
        await sleep(fullConfig.retryDelay * (attempt + 1)) // Exponential backoff
        continue
      }

      // No more retries or non-retryable error
      break
    }
  }

  // All retries failed
  if (fullConfig.fallbackValue !== undefined) {
    logger.warn('Provider: Using fallback value', {
      provider: fullConfig.provider,
      operation,
    })
    return fullConfig.fallbackValue
  }

  // Log the original error clearly before throwing
  logger.error('Provider: All retries exhausted', {
    provider: fullConfig.provider,
    operation,
    attempts: fullConfig.retries + 1,
    originalError: lastError?.message,
    errorStack: lastError?.stack,
    errorName: lastError?.name,
  })

  // Throw wrapped error with original error details
  const wrappedMessage = lastError 
    ? `Provider operation failed after ${fullConfig.retries + 1} attempts: ${lastError.message}`
    : `Provider operation failed after ${fullConfig.retries + 1} attempts`
  
  throw new ProviderError(
    wrappedMessage,
    fullConfig.provider || 'unknown',
    operation,
    lastError
  )
}

/**
 * Add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

/**
 * Check if error is retryable
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  
  // Network errors are retryable
  if (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('fetch failed')
  ) {
    return true
  }

  // Rate limit errors are retryable
  if (message.includes('rate limit') || message.includes('429')) {
    return true
  }

  // Server errors (5xx) are retryable
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true
  }

  // Client errors (4xx) are NOT retryable (except 429)
  if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
    return false
  }

  // Default: retry
  return true
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Provider-specific resilience configs
 */
export const ProviderConfigs = {
  OPENAI: {
    timeout: 60000, // 60 seconds for LLM
    retries: 2,
    retryDelay: 2000,
    provider: 'openai',
    trackCost: true,
  },
  DUFFEL: {
    timeout: 30000,
    retries: 2,
    retryDelay: 1000,
    provider: 'duffel',
    trackCost: true,
  },
  HOTELBEDS: {
    timeout: 30000,
    retries: 2,
    retryDelay: 1000,
    provider: 'hotelbeds',
    trackCost: true,
  },
  GOOGLE_MAPS: {
    timeout: 15000,
    retries: 1,
    retryDelay: 500,
    provider: 'google-maps',
    trackCost: true,
  },
  SUPABASE: {
    timeout: 10000,
    retries: 2,
    retryDelay: 500,
    provider: 'supabase',
    trackCost: false,
  },
}
