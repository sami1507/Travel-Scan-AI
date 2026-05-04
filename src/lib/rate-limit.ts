// Simple in-memory rate limiting for API routes
// Production-ready for single-instance deployments
// For multi-instance, consider Redis or Upstash

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  
  let entry = rateLimitStore.get(key)
  
  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
  }
  
  // Increment count
  entry.count++
  
  const remaining = Math.max(0, config.maxRequests - entry.count)
  const success = entry.count <= config.maxRequests
  
  return {
    success,
    limit: config.maxRequests,
    remaining,
    reset: entry.resetAt,
  }
}

/**
 * Rate limit middleware for API routes
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 * @returns Response if rate limited, null otherwise
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Response | null {
  const result = checkRateLimit(identifier, config)
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        limit: result.limit,
        reset: new Date(result.reset).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  
  return null
}

// Preset configurations
export const RATE_LIMITS = {
  // Expensive AI operations
  ANALYSIS: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  
  // Feedback operations
  FEEDBACK: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  
  // Share/export operations
  SHARE: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  
  // Admin operations
  ADMIN: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  
  // General API
  GENERAL: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
}
