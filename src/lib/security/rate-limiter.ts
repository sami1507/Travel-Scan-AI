// Rate limiter for API routes
// Uses Upstash Redis (Vercel KV compatible) if configured, falls back to in-memory for development

import { Redis } from '@upstash/redis'

// Initialize Redis client (uses Vercel KV env vars)
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

// In-memory fallback for development
const memoryStore = new Map<string, { count: number; resetTime: number }>()

export const RATE_LIMITS = {
  TRAVEL_ANALYSIS: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  AI_INTELLIGENCE: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  FEEDBACK: { maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30 per hour
  SHARE: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  PUBLIC_SHARE: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour (unauthenticated)
} as const

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a user/IP
 * @param identifier - User ID or IP address
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`
  const now = Date.now()
  const resetTime = now + config.windowMs

  try {
    // Try Redis/KV first if available
    if (redis) {
      const count = await redis.incr(key)
      
      if (count === 1) {
        // First request in window, set expiry
        await redis.pexpire(key, config.windowMs)
      }

      const ttl = await redis.pttl(key)
      const reset = now + (ttl > 0 ? ttl : config.windowMs)

      return {
        success: count <= config.maxRequests,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
        reset: Math.floor(reset / 1000),
      }
    }
    
    // If Redis not configured, fall through to in-memory
    throw new Error('Redis not configured')
  } catch (error) {
    // Fallback to in-memory store for development
    const stored = memoryStore.get(key)
    
    if (!stored || now > stored.resetTime) {
      // New window
      memoryStore.set(key, { count: 1, resetTime })
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: Math.floor(resetTime / 1000),
      }
    }

    // Increment count
    stored.count++
    memoryStore.set(key, stored)

    return {
      success: stored.count <= config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - stored.count),
      reset: Math.floor(stored.resetTime / 1000),
    }
  }
}

/**
 * Get client identifier (user ID or IP)
 */
export function getClientIdentifier(userId?: string, request?: Request): string {
  if (userId) return userId

  // Fallback to IP for unauthenticated requests
  if (request) {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    return `ip:${ip}`
  }

  return 'unknown'
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.max(0, result.reset - Math.floor(Date.now() / 1000)).toString(),
      },
    }
  )
}
